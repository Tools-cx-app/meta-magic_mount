use std::{collections::HashSet, fs, path::Path};

use serde::Serialize;

use crate::{
    defs::{DISABLE_FILE_NAME, REMOVE_FILE_NAME, SKIP_MOUNT_FILE_NAME},
    utils::validate_module_id,
};

#[derive(Debug, Serialize)]
pub struct ModuleInfo {
    pub id: String,
    name: String,
    version: String,
    author: String,
    description: String,
    disabled: bool,
    skip: bool,
}

fn read_prop(vaule: &str, key: &str) -> Option<String> {
    for line in vaule.lines() {
        if line.starts_with(key)
            && let Some((_, value)) = line.split_once('=')
        {
            return Some(value.trim().to_string());
        }
    }
    None
}

/// Scans for modules that will be actually mounted by `magic_mount`.
/// Filters out modules that:
/// 1. Do not have a `system` directory.
/// 2. Are disabled or removed.
/// 3. Have the `skip_mount` flag.
pub fn scan_modules<P>(module_dir: P, extra: &[String]) -> Vec<ModuleInfo>
where
    P: AsRef<Path>,
{
    let mut modules = Vec::new();

    if let Ok(entries) = module_dir.as_ref().read_dir() {
        for entry in entries.flatten() {
            let path = entry.path();

            if !path.is_dir() {
                continue;
            }

            if !path.join("module.prop").exists() {
                continue;
            }

            let mut modified = false;
            let mut partitions = HashSet::new();
            partitions.insert("system".to_string());
            partitions.extend(extra.iter().cloned());

            for p in &partitions {
                if entry.path().join(p).is_dir() {
                    modified = true;
                    break;
                }
            }

            if !modified {
                continue;
            }

            let disabled =
                path.join(DISABLE_FILE_NAME).exists() || path.join(REMOVE_FILE_NAME).exists();
            let skip = path.join(SKIP_MOUNT_FILE_NAME).exists();
            if disabled || skip {
                continue;
            }

            let prop_path = path.join("module.prop");

            let Ok(prop) = fs::read_to_string(prop_path) else {
                continue;
            };
            let id = read_prop(&prop, "id").unwrap_or_else(|| "unknown".to_string());
            let name = read_prop(&prop, "name").unwrap_or_else(|| id.clone());
            let version = read_prop(&prop, "version").unwrap_or_else(|| "unknown".to_string());
            let author = read_prop(&prop, "author").unwrap_or_else(|| "unknown".to_string());
            let description =
                read_prop(&prop, "description").unwrap_or_else(|| "unknown".to_string());

            if validate_module_id(&id).is_ok() {
                modules.push(ModuleInfo {
                    id,
                    name,
                    version,
                    author,
                    description,
                    disabled,
                    skip,
                });
            }
        }
    }
    modules.sort_by(|a, b| a.id.cmp(&b.id));

    modules
}
