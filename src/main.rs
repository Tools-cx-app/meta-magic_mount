mod config;
mod utils;

// NOTE: You should move your previous `magic_mount` module to `engine/magic.rs`
// and `meta-overlayfs/src/mount.rs` to `engine/overlay.rs`
// mod engine; 

use std::collections::{HashMap, HashSet};
use std::path::{Path, PathBuf};
use anyhow::{Context, Result};
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

// Constants for decision engine
const PARTITIONS: &[&str] = &["system", "vendor", "product", "system_ext", "odm", "oem"];

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
    utils::init_logger(config.verbose)?;

    log::info!("Hybrid Mount Starting...");

    // 1. Load module modes from config (e.g., module_id=magic)
    let module_modes = config::load_module_modes();

    // 2. Scan enabled modules
    // In real implementation, you should scan config.moduledir
    let enabled_modules = scan_enabled_modules(&config.moduledir)?;
    log::info!("Found {} enabled modules", enabled_modules.len());

    // 3. Group modules by partition and Decide Mode
    // Map: Partition -> List of Module IDs
    let mut partition_map: HashMap<String, Vec<PathBuf>> = HashMap::new();
    // Map: Partition -> Force Magic Mount?
    let mut magic_force_map: HashMap<String, bool> = HashMap::new();

    for module_path in enabled_modules {
        let module_id = module_path.file_name().unwrap().to_string_lossy().to_string();
        let user_mode = module_modes.get(&module_id).map(|s| s.as_str()).unwrap_or("auto");
        
        let is_magic = user_mode == "magic";

        // Check which partitions this module modifies
        // Assuming module structure: /data/adb/modules/<id>/<partition>/...
        // Or if using modules.img, adjust path accordingly
        for &part in PARTITIONS {
            let part_dir = module_path.join(part);
            if part_dir.is_dir() {
                partition_map.entry(part.to_string()).or_default().push(module_path.clone());
                
                // Per-partition decision logic:
                // If ANY module in this partition is set to 'magic', the whole partition degrades to magic mount.
                if is_magic {
                    magic_force_map.insert(part.to_string(), true);
                    log::info!("Partition '{}' forced to Magic Mount due to module '{}'", part, module_id);
                }
            }
        }
    }

    // Add extra partitions from config
    for part in &config.partitions {
        if !partition_map.contains_key(part) {
             partition_map.insert(part.clone(), Vec::new());
        }
    }

    // 4. Execute Mounts
    // You need to initialize tempdir for magic mount
    let tempdir = if let Some(t) = &config.tempdir { t.clone() } else { utils::select_temp_dir()? };
    utils::ensure_temp_dir(&tempdir)?;

    for (part, modules) in partition_map {
        if modules.is_empty() { continue; }
        
        let use_magic = *magic_force_map.get(&part).unwrap_or(&false);

        if use_magic {
            log::info!("Mounting {} using MAGIC MOUNT engine", part);
            // Call your magic mount engine here
            // engine::magic::mount_partition(&part, &modules, &tempdir)?;
        } else {
            log::info!("Mounting {} using OVERLAYFS engine", part);
            // Call your overlayfs engine here
            // engine::overlay::mount_partition(&part, &modules)?;
            // If overlay fails, you might want to fallback to magic here too
        }
    }
    
    // Clean up
    utils::cleanup_temp_dir(&tempdir);
    log::info!("Hybrid Mount Completed");
    Ok(())
}

fn scan_enabled_modules(module_dir: &Path) -> Result<Vec<PathBuf>> {
    let mut modules = Vec::new();
    if !module_dir.exists() { return Ok(modules); }

    for entry in fs::read_dir(module_dir)? {
        let entry = entry?;
        let path = entry.path();
        if path.is_dir() {
            // Check for disable/skip_mount/remove
            if path.join("disable").exists() || 
               path.join("remove").exists() || 
               path.join("skip_mount").exists() {
                continue;
            }
            // Skip self
            if path.ends_with("meta-hybrid") { continue; }
            
            modules.push(path);
        }
    }
    Ok(modules)
}
