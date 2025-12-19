mod node;
mod utils;

use std::{
    fs,
    path::{Path, PathBuf},
};

use anyhow::{Context, Result, bail};
use rustix::mount::{MountFlags, MountPropagationFlags, mount, mount_change};

use crate::{
    magic_mount::{
        node::Node,
        utils::{clone_symlink, collect_module_files},
    },
    utils::ensure_dir_exists,
};

struct MagicMount {
    node: Node,
    path: PathBuf,
    work_dir_path: PathBuf,
    has_tmpfs: bool,
    #[cfg(any(target_os = "linux", target_os = "android"))]
    umount: bool,
}

impl MagicMount {
    fn new<P>(
        node: &Node,
        path: P,
        work_dir_path: P,
        has_tmpfs: bool,
        #[cfg(any(target_os = "linux", target_os = "android"))] umount: bool,
    ) -> Self
    where
        P: AsRef<Path>,
    {
        Self {
            node: node.clone(),
            path: path.as_ref().join(node.name.clone()),
            work_dir_path: work_dir_path.as_ref().join(node.name.clone()),
            has_tmpfs,
            #[cfg(any(target_os = "linux", target_os = "android"))]
            umount,
        }
    }

    fn do_mount(&self) {}
}

impl MagicMount {
    fn symlink(&mut self) -> Result<()> {
        if let Some(module_path) = &self.node.module_path {
            log::debug!(
                "create module symlink {} -> {}",
                module_path.display(),
                self.work_dir_path.display()
            );
            clone_symlink(module_path, &self.work_dir_path).with_context(|| {
                format!(
                    "create module symlink {} -> {}",
                    module_path.display(),
                    self.work_dir_path.display(),
                )
            })?;
            Ok(())
        } else {
            bail!("cannot mount root symlink {}!", self.path.display());
        }
    }
}

pub fn magic_mount<P>(
    tmp_path: P,
    module_dir: &Path,
    mount_source: &str,
    extra_partitions: &[String],
    #[cfg(any(target_os = "linux", target_os = "android"))] umount: bool,
    #[cfg(not(any(target_os = "linux", target_os = "android")))] _umount: bool,
) -> Result<()>
where
    P: AsRef<Path>,
{
    if let Some(root) = collect_module_files(module_dir, extra_partitions) {
        log::debug!("collected: {root}");
        std::thread::Builder::new()
            .name("GetTree".to_string())
            .spawn(|| -> Result<()> {
                let output = std::process::Command::new("busybox")
                    .args(["tree", "/data/adb/modules"])
                    .output();

                if output.is_err() {
                    return Ok(());
                }

                let _ = fs::write(
                    "/data/adb/magic_mount/tree",
                    String::from_utf8_lossy(&output?.stdout).to_string(),
                );

                Ok(())
            })?;

        let tmp_root = tmp_path.as_ref();
        let tmp_dir = tmp_root.join("workdir");
        ensure_dir_exists(&tmp_dir)?;

        mount(mount_source, &tmp_dir, "tmpfs", MountFlags::empty(), None).context("mount tmp")?;
        mount_change(&tmp_dir, MountPropagationFlags::PRIVATE).context("make tmp private")?;
    } else {
        log::info!("no modules to mount, skipping!");
    }
    Ok(())
}
