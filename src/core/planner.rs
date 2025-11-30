// src/core/planner.rs
use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::{Path, PathBuf};
use anyhow::Result;
use crate::{conf::config, defs, core::inventory::Module};

#[derive(Debug)]
pub struct OverlayOperation {
    pub target: String,
    // Layers ordered from TOP to BOTTOM (Higher priority first)
    pub lowerdirs: Vec<PathBuf>,
}

#[derive(Debug, Default)]
pub struct MountPlan {
    pub overlay_ops: Vec<OverlayOperation>,
    pub magic_module_paths: Vec<PathBuf>,
    
    // For stats
    pub overlay_module_ids: Vec<String>,
    pub magic_module_ids: Vec<String>,
}

/// Generates a mount plan based on the inventory and current storage state.
/// The storage_root contains the SYNCED module files.
pub fn generate(
    config: &config::Config, 
    modules: &[Module], 
    storage_root: &Path
) -> Result<MountPlan> {
    let mut plan = MountPlan::default();
    
    let mut partition_layers: HashMap<String, Vec<PathBuf>> = HashMap::new();
    let mut magic_paths = HashSet::new();
    let mut overlay_ids = HashSet::new();
    let mut magic_ids = HashSet::new();

    // Partitions to consider for OverlayFS
    let mut target_partitions = defs::BUILTIN_PARTITIONS.to_vec();
    target_partitions.extend(config.partitions.iter().map(|s| s.as_str()));

    // Modules are already sorted Z->A in inventory.
    // Iterate through them to build layers.
    for module in modules {
        let content_path = storage_root.join(&module.id);
        
        if !content_path.exists() {
            log::debug!("Planner: Module {} content missing (sync failed?), skipping", module.id);
            continue;
        }

        if module.mode == "magic" {
            // Force Magic Mount
            if has_meaningful_content(&content_path, &target_partitions) {
                magic_paths.insert(content_path);
                magic_ids.insert(module.id.clone());
            }
        } else {
            // Try OverlayFS ("auto" mode)
            let mut participates_in_overlay = false;

            for part in &target_partitions {
                let part_path = content_path.join(part);
                if part_path.is_dir() && has_files(&part_path) {
                    // Add to overlay layers
                    partition_layers.entry(part.to_string())
                        .or_default()
                        .push(part_path);
                    participates_in_overlay = true;
                }
            }

            if participates_in_overlay {
                overlay_ids.insert(module.id.clone());
            } else {
                if has_meaningful_content(&content_path, &target_partitions) {
                }
            }
        }
    }

    // Construct Overlay Operations
    for (part, layers) in partition_layers {
        plan.overlay_ops.push(OverlayOperation {
            target: format!("/{}", part),
            lowerdirs: layers,
        });
    }

    plan.magic_module_paths = magic_paths.into_iter().collect();
    plan.overlay_module_ids = overlay_ids.into_iter().collect();
    plan.magic_module_ids = magic_ids.into_iter().collect();

    // Sort IDs for consistent reporting
    plan.overlay_module_ids.sort();
    plan.magic_module_ids.sort();

    Ok(plan)
}

fn has_files(path: &Path) -> bool {
    if let Ok(entries) = fs::read_dir(path) {
        for entry in entries.flatten() {
            return true;
        }
    }
    false
}

fn has_meaningful_content(base: &Path, partitions: &[&str]) -> bool {
    for part in partitions {
        let p = base.join(part);
        if p.exists() && has_files(&p) {
            return true;
        }
    }
    false
}
