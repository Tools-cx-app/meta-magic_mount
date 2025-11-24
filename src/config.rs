use std::{
    collections::HashMap,
    fs,
    path::{Path, PathBuf},
};

use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};

pub const CONFIG_FILE_DEFAULT: &str = "/data/adb/meta-hybrid/config.toml";
pub const MODULE_MODE_FILE: &str = "/data/adb/meta-hybrid/module_mode.conf";

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Config {
    #[serde(default = "default_moduledir")]
    pub moduledir: PathBuf,
    pub tempdir: Option<PathBuf>,
    #[serde(default = "default_mountsource")]
    pub mountsource: String,
    pub verbose: bool,
    #[serde(default)]
    pub partitions: Vec<String>,
}

fn default_moduledir() -> PathBuf {
    PathBuf::from("/data/adb/modules/")
}

fn default_mountsource() -> String {
    String::from("HybridMount")
}

impl Default for Config {
    fn default() -> Self {
        Self {
            moduledir: default_moduledir(),
            tempdir: None,
            mountsource: default_mountsource(),
            verbose: false,
            partitions: Vec::new(),
        }
    }
}

impl Config {
    pub fn from_file<P: AsRef<Path>>(path: P) -> Result<Self> {
        let content = fs::read_to_string(path.as_ref()).context("failed to read config file")?;
        let config: Config = toml::from_str(&content).context("failed to parse config file")?;
        Ok(config)
    }

    pub fn load_default() -> Option<Self> {
        Self::from_file(CONFIG_FILE_DEFAULT).ok()
    }

    pub fn save_to_file<P: AsRef<Path>>(&self, path: P) -> Result<()> {
        let content = toml::to_string_pretty(self).context("failed to serialize config")?;
        if let Some(parent) = path.as_ref().parent() {
            fs::create_dir_all(parent).context("failed to create config directory")?;
        }
        fs::write(path.as_ref(), content).context("failed to write config file")?;
        Ok(())
    }

    pub fn merge_with_cli(
        &mut self,
        moduledir: Option<PathBuf>,
        tempdir: Option<PathBuf>,
        mountsource: Option<String>,
        verbose: bool,
        partitions: Vec<String>,
    ) {
        if let Some(dir) = moduledir { self.moduledir = dir; }
        if tempdir.is_some() { self.tempdir = tempdir; }
        if let Some(source) = mountsource { self.mountsource = source; }
        if verbose { self.verbose = true; }
        if !partitions.is_empty() { self.partitions = partitions; }
    }
}

// Module Mode Helpers
pub fn load_module_modes() -> HashMap<String, String> {
    let mut modes = HashMap::new();
    if let Ok(content) = fs::read_to_string(MODULE_MODE_FILE) {
        for line in content.lines() {
            if let Some((id, mode)) = line.split_once('=') {
                modes.insert(id.trim().to_string(), mode.trim().to_lowercase());
            }
        }
    }
    modes
}
