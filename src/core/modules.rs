// meta-hybrid_mount/src/core/modules.rs
use std::fs;
use std::io::{BufRead, BufReader};
use std::path::{Path, PathBuf};
use anyhow::Result;
use serde::Serialize;
use crate::{conf::config, defs, utils, core::state};

#[derive(Serialize)]
struct ModuleInfo {
    id: String,
    name: String,
    version: String,
    author: String,
    description: String,
    mode: String,
}

fn read_prop(path: &Path, key: &str) -> Option<String> {
    if let Ok(file) = fs::File::open(path) {
        let reader = BufReader::new(file);
        for line in reader.lines().flatten() {
            if line.starts_with(key) && line.chars().nth(key.len()) == Some('=') {
                return Some(line[key.len() + 1..].to_string());
            }
        }
    }
    None
}

// Check if a directory recursively contains any files (or symlinks/devices)
// Returns true if at least one non-directory entry is found.
fn has_files_recursive(path: &Path) -> bool {
    if let Ok(entries) = fs::read_dir(path) {
        for entry in entries.flatten() {
            let file_type = match entry.file_type() {
                Ok(ft) => ft,
                Err(_) => continue,
            };

            // If it's a directory, recurse. 
            // If it's a file or symlink (or block/char device), it counts as content.
            if file_type.is_dir() {
                if has_files_recursive(&entry.path()) {
                    return true;
                }
            } else {
                return true;
            }
        }
    }
    false
}

pub fn update_description(storage_mode: &str, nuke_active: bool, overlay_count: usize, magic_count: usize) {
    let path = Path::new(defs::MODULE_PROP_FILE);
    if !path.exists() { 
        log::warn!("module.prop not found at {}, skipping description update", path.display());
        return; 
    }

    let mode_str = if storage_mode == "tmpfs" { "Tmpfs" } else { "Ext4" };
    let status_emoji = if storage_mode == "tmpfs" { "🐾" } else { "💿" };
    
    let nuke_str = if nuke_active { " | 肉垫: 开启 ✨" } else { "" };
    
    let new_desc = format!(
        "description=😋 运行中喵～ ({}) {} | Overlay: {} | Magic: {}{}", 
        mode_str, status_emoji, overlay_count, magic_count, nuke_str
    );

    let mut new_lines = Vec::new();
    match fs::read_to_string(path) {
        Ok(content) => {
            for line in content.lines() {
                if line.starts_with("description=") {
                    new_lines.push(new_desc.clone());
                } else {
                    new_lines.push(line.to_string());
                }
            }
            if let Err(e) = fs::write(path, new_lines.join("\n")) {
                log::error!("Failed to update module.prop: {}", e);
            } else {
                log::info!("Updated module.prop description (Meow!).");
            }
        },
        Err(e) => log::error!("Failed to read module.prop: {}", e),
    }
}

pub fn scan_enabled_ids(metadata_dir: &Path) -> Result<Vec<String>> {
    let mut ids = Vec::new();
    if !metadata_dir.exists() { return Ok(ids); }
    for entry in fs::read_dir(metadata_dir)? {
        let entry = entry?;
        let path = entry.path();
        if !path.is_dir() { continue; }
        let id = entry.file_name().to_string_lossy().to_string();
        if id == "meta-hybrid" || id == "lost+found" { continue; }
        if path.join(defs::DISABLE_FILE_NAME).exists() || path.join(defs::REMOVE_FILE_NAME).exists() || path.join(defs::SKIP_MOUNT_FILE_NAME).exists() { continue; }
        ids.push(id);
    }
    Ok(ids)
}

/// Recursively fix SELinux contexts of a module by mirroring from the real system.
fn repair_contexts(module_root: &Path, current_path: &Path) -> Result<()> {
    if !current_path.exists() { return Ok(()); }
    let relative = current_path.strip_prefix(module_root)?;
    let system_path = Path::new("/").join(relative);
    if system_path.exists() {
        if let Err(e) = utils::copy_path_context(&system_path, current_path) {
            log::debug!("Failed to mirror context for {}: {}", relative.display(), e);
        }
    } else {
        // If system path doesn't exist, rely on initial copy or inheritance
    }

    if current_path.is_dir() {
        for entry in fs::read_dir(current_path)? {
            let entry = entry?;
            repair_contexts(module_root, &entry.path())?;
        }
    }
    Ok(())
}

pub fn sync_active(source_dir: &Path, target_base: &Path) -> Result<()> {
    log::info!("Syncing modules from {} to {}", source_dir.display(), target_base.display());
    let ids = scan_enabled_ids(source_dir)?;
    log::debug!("Found {} enabled modules to sync.", ids.len());
    
    // 1. Wipe storage completely (Force clean start)
    if target_base.exists() {
        log::info!("Wiping storage for fresh sync...");
        for entry in fs::read_dir(target_base)? {
            let entry = entry?;
            let path = entry.path();
            let name = entry.file_name().to_string_lossy().to_string();
            
            // Preserve lost+found (fsck) and meta-hybrid (internal)
            if name == "lost+found" || name == "meta-hybrid" { continue; }

            if path.is_dir() {
                if let Err(e) = fs::remove_dir_all(&path) {
                    log::warn!("Failed to wipe directory {}: {}", name, e);
                }
            } else {
                if let Err(e) = fs::remove_file(&path) {
                    log::warn!("Failed to wipe file {}: {}", name, e);
                }
            }
        }
    }

    // 2. Sync enabled modules
    for id in ids {
        let src = source_dir.join(&id);
        let dst = target_base.join(&id);
        
        // Check if any partition directory has ACTUAL files inside recursively
        let has_content = defs::BUILTIN_PARTITIONS.iter().any(|p| {
            let part_path = src.join(p);
            part_path.exists() && has_files_recursive(&part_path)
        });
        
        if has_content {
            log::debug!("Syncing module: {}", id);
            // Native cp_r will create the destination dir
            if let Err(e) = utils::sync_dir(&src, &dst) {
                log::error!("Failed to sync module {}: {}", id, e);
            } else {
                // 3. Context Mirroring Pass
                log::debug!("Repairing SELinux contexts for {}", id);
                for part in defs::BUILTIN_PARTITIONS {
                    let part_root = dst.join(part);
                    if part_root.exists() {
                        if let Err(e) = repair_contexts(&dst, &part_root) {
                            log::warn!("Context repair failed for {}/{}: {}", id, part, e);
                        }
                    }
                }
            }
        } else {
            // Module is empty, since we wiped storage, we just do nothing.
            log::debug!("Skipping sync for empty module: {}", id);
        }
    }
    Ok(())
}

pub fn print_list(config: &config::Config) -> Result<()> {
    let module_modes = config::load_module_modes();
    let modules_dir = &config.moduledir;
    let mut modules = Vec::new();

    let state = state::RuntimeState::load().unwrap_or_default();
    
    let mut mnt_base = PathBuf::from(defs::FALLBACK_CONTENT_DIR);
    if !state.mount_point.as_os_str().is_empty() {
        mnt_base = state.mount_point;
    }

    if modules_dir.exists() {
        for entry in fs::read_dir(modules_dir)? {
            let entry = entry?;
            let path = entry.path();
            if !path.is_dir() { continue; }
            let id = entry.file_name().to_string_lossy().to_string();
            if id == "meta-hybrid" || id == "lost+found" { continue; }
            if path.join(defs::DISABLE_FILE_NAME).exists() || path.join(defs::REMOVE_FILE_NAME).exists() || path.join(defs::SKIP_MOUNT_FILE_NAME).exists() { continue; }

            // Check content recursively to match sync_active logic
            // We check both source (if not mounted yet) and destination (if mounted)
            let has_content = defs::BUILTIN_PARTITIONS.iter().any(|p| {
                let p_src = path.join(p);
                let p_dst = mnt_base.join(&id).join(p);
                (p_src.exists() && has_files_recursive(&p_src)) || 
                (p_dst.exists() && has_files_recursive(&p_dst))
            });

            if has_content {
                let prop_path = path.join("module.prop");
                let name = read_prop(&prop_path, "name").unwrap_or_else(|| id.clone());
                let version = read_prop(&prop_path, "version").unwrap_or_default();
                let author = read_prop(&prop_path, "author").unwrap_or_default();
                let description = read_prop(&prop_path, "description").unwrap_or_default();
                let mode = module_modes.get(&id).cloned().unwrap_or_else(|| "auto".to_string());
                modules.push(ModuleInfo { id, name, version, author, description, mode });
            }
        }
    }
    modules.sort_by(|a, b| a.name.cmp(&b.name));
    println!("{}", serde_json::to_string(&modules)?);
    Ok(())
}
