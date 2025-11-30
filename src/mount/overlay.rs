// src/mount/overlay.rs
// Logic ported and adapted from meta-overlayfs/src/mount.rs

use anyhow::{Context, Result, bail};
use log::{info, warn};
use std::path::{Path, PathBuf};

use procfs::process::Process;
use rustix::{fd::AsFd, fs::CWD, mount::*};

use crate::defs::KSU_OVERLAY_SOURCE;
use crate::utils::send_unmountable;

/// Low-level function to mount overlayfs using modern fsopen API or fallback to mount()
pub fn mount_overlayfs(
    lower_dirs: &[String],
    lowest: &str,
    upperdir: Option<PathBuf>,
    workdir: Option<PathBuf>,
    dest: impl AsRef<Path>,
    disable_umount: bool,
) -> Result<()> {
    let lowerdir_config = lower_dirs
        .iter()
        .map(|s| s.as_ref())
        .chain(std::iter::once(lowest))
        .collect::<Vec<_>>()
        .join(":");
    
    info!(
        "mount overlayfs on {:?}, lowerdir={}, upperdir={:?}, workdir={:?}",
        dest.as_ref(),
        lowerdir_config,
        upperdir,
        workdir
    );

    let upperdir = upperdir
        .filter(|up| up.exists())
        .map(|e| e.display().to_string());
    let workdir = workdir
        .filter(|wd| wd.exists())
        .map(|e| e.display().to_string());

    let result = (|| {
        let fs = fsopen("overlay", FsOpenFlags::FSOPEN_CLOEXEC)?;
        let fs = fs.as_fd();
        fsconfig_set_string(fs, "lowerdir", &lowerdir_config)?;
        if let (Some(upperdir), Some(workdir)) = (&upperdir, &workdir) {
            fsconfig_set_string(fs, "upperdir", upperdir)?;
            fsconfig_set_string(fs, "workdir", workdir)?;
        }
        fsconfig_set_string(fs, "source", KSU_OVERLAY_SOURCE)?;
        fsconfig_create(fs)?;
        let mount = fsmount(fs, FsMountFlags::FSMOUNT_CLOEXEC, MountAttrFlags::empty())?;
        move_mount(
            mount.as_fd(),
            "",
            CWD,
            dest.as_ref(),
            MoveMountFlags::MOVE_MOUNT_F_EMPTY_PATH,
        )
    })();

    if let Err(e) = result {
        warn!("fsopen mount failed: {e:#}, fallback to mount");
        let mut data = format!("lowerdir={lowerdir_config}");
        if let (Some(upperdir), Some(workdir)) = (upperdir, workdir) {
            data = format!("{data},upperdir={upperdir},workdir={workdir}");
        }
        mount(
            KSU_OVERLAY_SOURCE,
            dest.as_ref(),
            "overlay",
            MountFlags::empty(),
            data,
        )?;
    }
    
    if !disable_umount {
        let _ = send_unmountable(dest.as_ref());
    }
    
    Ok(())
}

/// Helper to bind mount a path
pub fn bind_mount(from: impl AsRef<Path>, to: impl AsRef<Path>, disable_umount: bool) -> Result<()> {
    info!(
        "bind mount {} -> {}",
        from.as_ref().display(),
        to.as_ref().display()
    );
    let tree = open_tree(
        CWD,
        from.as_ref(),
        OpenTreeFlags::OPEN_TREE_CLOEXEC
            | OpenTreeFlags::OPEN_TREE_CLONE
            | OpenTreeFlags::AT_RECURSIVE,
    )?;
    move_mount(
        tree.as_fd(),
        "",
        CWD,
        to.as_ref(),
        MoveMountFlags::MOVE_MOUNT_F_EMPTY_PATH,
    )?;
    
    if !disable_umount {
        let _ = send_unmountable(to.as_ref());
    }
    
    Ok(())
}

/// Handles recursive overlay mounting for child mount points (e.g. /system/vendor)
fn mount_overlay_child(
    mount_point: &str,
    relative: &str,
    module_roots: &[String],
    stock_root: &str,
    disable_umount: bool,
) -> Result<()> {
    // Check if any module modifies this child path
    // module_roots are strings like "/mnt/img/ModuleA", "/mnt/img/ModuleB"
    // relative is like "/vendor" (if we are overlaying /system and found /system/vendor)
    
    // We need to check: does /mnt/img/ModuleA/vendor exist?
    // Note: relative comes from mount_point replacement, so it starts with / usually.
    let has_modification = module_roots.iter().any(|lower| {
        let path = Path::new(lower).join(relative.trim_start_matches('/'));
        path.exists()
    });

    if !has_modification {
        // If no module touches this child mount, just bind mount the original back
        // to restore visibility.
        return bind_mount(stock_root, mount_point, disable_umount);
    }

    if !Path::new(stock_root).is_dir() {
        return Ok(());
    }

    // Collect lowerdirs for this specific child path
    let mut lower_dirs: Vec<String> = vec![];
    for lower in module_roots {
        let path = Path::new(lower).join(relative.trim_start_matches('/'));
        if path.is_dir() {
            lower_dirs.push(path.display().to_string());
        } else if path.exists() {
            // File covering directory? Edge case, might want to skip or handle differently.
            // For now, if it exists but isn't dir, we skip adding it to lowerdir list 
            // (OverlayFS merging dir and file is invalid)
            return Ok(());
        }
    }

    if lower_dirs.is_empty() {
        return Ok(());
    }

    // Merge modules and original stock child
    if let Err(e) = mount_overlayfs(&lower_dirs, stock_root, None, None, mount_point, disable_umount) {
        warn!("failed to overlay child {mount_point}: {e:#}, fallback to bind mount");
        bind_mount(stock_root, mount_point, disable_umount)?;
    }
    Ok(())
}

/// The main entry point for overlay mounting with robustness
pub fn mount_overlay(
    target_root: &str, // e.g. "/system"
    module_roots: &[String], // List of module paths containing "system"
    workdir: Option<PathBuf>,
    upperdir: Option<PathBuf>,
    disable_umount: bool,
) -> Result<()> {
    info!("Starting robust overlay mount for {target_root}");
    
    // 1. Change to target directory to ensure relative paths work and we hold a ref
    std::env::set_current_dir(target_root)
        .with_context(|| format!("failed to chdir to {target_root}"))?;
    
    let stock_root = "."; // Represents the original content of target_root

    // 2. Scan for existing child mounts under this target
    // We need to do this BEFORE we mount over it, so we know what to restore.
    let mounts = Process::myself()?
        .mountinfo()
        .with_context(|| "get mountinfo")?;
        
    let mut mount_seq = mounts.0.iter()
        .filter(|m| {
            // Find mounts that are strictly underneath the target_root
            m.mount_point.starts_with(target_root) && 
            m.mount_point != Path::new(target_root)
        })
        .map(|m| m.mount_point.to_string_lossy().to_string())
        .collect::<Vec<_>>();
        
    // Sort to ensure we process deeper mounts correctly if needed
    mount_seq.sort();
    mount_seq.dedup();

    // 3. Mount the Root Overlay
    mount_overlayfs(module_roots, target_root, upperdir, workdir, target_root, disable_umount)
        .with_context(|| format!("mount overlayfs for root {target_root} failed"))?;

    // 4. Restore Child Mounts
    for mount_point in mount_seq {
        // Calculate relative path: /system/vendor -> /vendor (if root is /system)
        let relative = mount_point.replacen(target_root, "", 1);
        
        let stock_root_relative = format!("{}{}", stock_root, relative);
        
        // Check existence in the underlying root
        if !Path::new(&stock_root_relative).exists() {
            continue;
        }

        if let Err(e) = mount_overlay_child(&mount_point, &relative, module_roots, &stock_root_relative, disable_umount) {
            warn!("failed to restore child mount {mount_point}: {e:#}");
            // Don't bail, try next child
        }
    }
    
    Ok(())
}

fn umount_dir(src: impl AsRef<Path>) -> Result<()> {
    unmount(src.as_ref(), UnmountFlags::empty())
        .with_context(|| format!("Failed to umount {}", src.as_ref().display()))?;
    Ok(())
}
