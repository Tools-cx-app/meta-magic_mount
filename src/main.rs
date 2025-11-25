mod config;
mod defs;
mod utils;

// Legacy Magic Mount implementation
#[path = "magic_mount/mod.rs"]
mod magic_mount;

// OverlayFS implementation
mod overlay_mount;

use std::collections::{HashMap, HashSet};
use std::path::{Path, PathBuf};
use std::fs;
use anyhow::Result;
use clap::{Parser, Subcommand};
use config::{Config, CONFIG_FILE_DEFAULT};

#[derive(Parser, Debug)]
#[command(name = "meta-hybrid", version, about = "Hybrid Mount Metamodule")]
struct Cli {
    #[arg(short = 'c', long = "config")]
    config: Option<PathBuf>,
    #[arg(short = 'm', long = "moduledir")]
    moduledir: Option<PathBuf>,
    #[arg(short = 't', long = "tempdir")]
    tempdir: Option<PathBuf>,
    #[arg(short = 's', long = "mountsource")]
    mountsource: Option<String>,
    #[arg(short = 'v', long = "verbose")]
    verbose: bool,
    #[arg(short = 'p', long = "partitions", value_delimiter = ',')]
    partitions: Vec<String>,
    #[command(subcommand)]
    command: Option<Commands>,
}

#[derive(Subcommand, Debug)]
enum Commands {
    GenConfig {
        #[arg(short = 'o', long = "output", default_value = CONFIG_FILE_DEFAULT)]
        output: PathBuf,
    },
    ShowConfig,
}

const BUILTIN_PARTITIONS: &[&str] = &["system", "vendor", "product", "system_ext", "odm", "oem"];

fn load_config(cli: &Cli) -> Result<Config> {
    if let Some(config_path) = &cli.config {
        return Config::from_file(config_path);
    }
    if let Some(config) = Config::load_default() {
        return Ok(config);
    }
    Ok(Config::default())
}

fn main() -> Result<()> {
    let cli = Cli::parse();

    if let Some(command) = &cli.command {
        match command {
            Commands::GenConfig { output } => {
                let config = Config::default();
                config.save_to_file(output)?;
                println!("Config generated at {}", output.display());
                return Ok(());
            },
            Commands::ShowConfig => {
                let config = load_config(&cli)?;
                println!("{:#?}", config);
                return Ok(());
            }
        }
    }

    let mut config = load_config(&cli)?;
    config.merge_with_cli(cli.moduledir, cli.tempdir, cli.mountsource, cli.verbose, cli.partitions);
    
    utils::init_logger(config.verbose, Path::new(defs::DAEMON_LOG_FILE))?;

    log::info!("Hybrid Mount Starting...");

    // 1. Load Module Modes (User Config)
    let module_modes = config::load_module_modes();

    // Use HashMap to store active modules and their paths
    let mut active_modules: HashMap<String, PathBuf> = HashMap::new();

    // 1.1 Scan Standard Modules
    let std_module_ids = scan_enabled_module_ids(Path::new(defs::MODULE_METADATA_DIR))?;
    for id in std_module_ids {
        let path = Path::new(defs::MODULE_CONTENT_DIR).join(&id);
        active_modules.insert(id, path);
    }

    // 1.2 Scan Mnt Directory
    let mnt_base_dir = Path::new(defs::MODULE_CONTENT_DIR).join("meta-hybrid/mnt");
    if mnt_base_dir.exists() {
        log::debug!("Scanning mnt directory: {}", mnt_base_dir.display());
        if let Ok(entries) = fs::read_dir(&mnt_base_dir) {
            for entry in entries.flatten() {
                if entry.path().is_dir() {
                    let id = entry.file_name().to_string_lossy().to_string();
                    active_modules.entry(id).or_insert(entry.path());
                }
            }
        }
    }

    log::info!("Found {} enabled modules (Standard + Mnt)", active_modules.len());

    // 3. Group by Partition & Decide Mode
    let mut partition_map: HashMap<String, Vec<PathBuf>> = HashMap::new();
    let mut magic_force_map: HashMap<String, bool> = HashMap::new();
    
    // Prepare partition list
    let mut all_partitions = BUILTIN_PARTITIONS.to_vec();
    let extra_parts: Vec<&str> = config.partitions.iter().map(|s| s.as_str()).collect();
    all_partitions.extend(extra_parts);

    for (module_id, content_path) in active_modules {
        if !content_path.exists() {
            log::debug!("Module {} content missing at {}", module_id, content_path.display());
            continue;
        }

        let mode = module_modes.get(&module_id).map(|s| s.as_str()).unwrap_or("auto");
        let is_magic = mode == "magic";

        for &part in &all_partitions {
            let part_dir = content_path.join(part);
            if part_dir.is_dir() {
                partition_map.entry(part.to_string())
                    .or_default()
                    .push(content_path.clone()); 
                
                if is_magic {
                    magic_force_map.insert(part.to_string(), true);
                    log::info!("Partition /{} forced to Magic Mount by module '{}'", part, module_id);
                }
            }
        }
    }

    // 4. Execute Mounts
    let tempdir = if let Some(t) = &config.tempdir { t.clone() } else { utils::select_temp_dir()? };
    let mut magic_modules: HashSet<PathBuf> = HashSet::new();

    // First pass: Handle OverlayFS
    for (part, modules) in &partition_map {
        let use_magic = *magic_force_map.get(part).unwrap_or(&false);
        if !use_magic {
            let target_path = format!("/{}", part);
            // For OverlayFS, we need the full path to the partition directory inside the module
            let overlay_paths: Vec<String> = modules.iter()
                .map(|m| m.join(part).display().to_string())
                .collect();
            
            log::info!("Mounting {} [OVERLAY] ({} layers)", target_path, overlay_paths.len());
            if let Err(e) = overlay_mount::mount_overlay(&target_path, &overlay_paths, None, None) {
                log::error!("OverlayFS mount failed for {}: {:#}, falling back to Magic Mount", target_path, e);
                // Fallback: Mark this partition as magic and proceed
                magic_force_map.insert(part.to_string(), true);
            }
        }
    }

    // Second pass: Collect modules for Magic Mount
    let mut magic_partitions = Vec::new();
    for (part, _) in &partition_map {
        if *magic_force_map.get(part).unwrap_or(&false) {
            magic_partitions.push(part.clone());
            // Add all modules for this partition to the magic list
            if let Some(mods) = partition_map.get(part) {
                for m in mods {
                    magic_modules.insert(m.clone());
                }
            }
        }
    }

    if !magic_modules.is_empty() {
        log::info!("Starting Magic Mount Engine for partitions: {:?}", magic_partitions);
        utils::ensure_temp_dir(&tempdir)?;
        
        let module_list: Vec<PathBuf> = magic_modules.into_iter().collect();
        
        if let Err(e) = magic_mount::mount_partitions(
            &tempdir, 
            &module_list, 
            &config.mountsource, 
            &config.partitions
        ) {
            log::error!("Magic Mount failed: {:#}", e);
        }
        
        utils::cleanup_temp_dir(&tempdir);
    }

    log::info!("Hybrid Mount Completed");
    Ok(())
}

fn scan_enabled_module_ids(metadata_dir: &Path) -> Result<Vec<String>> {
    let mut ids = Vec::new();
    if !metadata_dir.exists() { return Ok(ids); }

    for entry in fs::read_dir(metadata_dir)? {
        let entry = entry?;
        let path = entry.path();
        if path.is_dir() {
            let id = entry.file_name().to_string_lossy().to_string();
            if id == "meta-hybrid" { continue; }
            if path.join(defs::DISABLE_FILE_NAME).exists() || 
               path.join(defs::REMOVE_FILE_NAME).exists() || 
               path.join(defs::SKIP_MOUNT_FILE_NAME).exists() {
                continue;
            }
            ids.push(id);
        }
    }
    Ok(ids)
}
