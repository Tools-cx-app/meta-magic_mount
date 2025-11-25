use std::{
    fs::{create_dir_all, remove_dir_all, remove_file, write, OpenOptions},
    io::Write,
    path::{Path, PathBuf},
    sync::Mutex,
};

use anyhow::{Context, Result, bail};
#[cfg(any(target_os = "linux", target_os = "android"))]
use extattr::{Flags as XattrFlags, lsetxattr};

const SELINUX_XATTR: &str = "security.selinux";

const TEMP_DIR_SUFFIX: &str = ".magic_mount";

const TMPFS_CANDIDATES: &[&str] = &["/mnt/vendor", "/mnt", "/debug_ramdisk"];

pub fn lsetfilecon<P: AsRef<Path>>(path: P, con: &str) -> Result<()> {
    #[cfg(any(target_os = "linux", target_os = "android"))]
    lsetxattr(&path, SELINUX_XATTR, con, XattrFlags::empty()).with_context(|| {
        format!(
            "Failed to change SELinux context for {}",
            path.as_ref().display()
        )
    })?;
    Ok(())
}

#[cfg(any(target_os = "linux", target_os = "android"))]
pub fn lgetfilecon<P: AsRef<Path>>(path: P) -> Result<String> {
    let con = extattr::lgetxattr(&path, SELINUX_XATTR).with_context(|| {
        format!(
            "Failed to get SELinux context for {}",
            path.as_ref().display()
        )
    })?;
    let con = String::from_utf8_lossy(&con);
    Ok(con.to_string())
}

#[cfg(not(any(target_os = "linux", target_os = "android")))]
pub fn lgetfilecon<P: AsRef<Path>>(_path: P) -> Result<String> {
    unimplemented!()
}

pub fn ensure_dir_exists<T: AsRef<Path>>(dir: T) -> Result<()> {
    let result = create_dir_all(&dir);
    if dir.as_ref().is_dir() && result.is_ok() {
        Ok(())
    } else {
        bail!("{} is not a regular directory", dir.as_ref().display())
    }
}

// --- Custom File Logger Implementation ---
struct FileLogger {
    file: Mutex<std::fs::File>,
}

impl log::Log for FileLogger {
    fn enabled(&self, metadata: &log::Metadata) -> bool {
        // Level filtering is handled by set_max_level
        true
    }

    fn log(&self, record: &log::Record) {
        if self.enabled(record.metadata()) {
            let mut file = self.file.lock().unwrap();
            // Format: [LEVEL] [Target] Message
            let _ = writeln!(
                file,
                "[{}] [{}] {}",
                record.level(),
                record.target(),
                record.args()
            );
        }
    }

    fn flush(&self) {
        let _ = self.file.lock().unwrap().flush();
    }
}

pub fn init_logger(verbose: bool, log_path: &Path) -> Result<()> {
    let level = if verbose {
        log::LevelFilter::Debug
    } else {
        log::LevelFilter::Info
    };

    // Ensure parent directory exists
    if let Some(parent) = log_path.parent() {
        create_dir_all(parent)?;
    }

    // Open file in append mode
    let file = OpenOptions::new()
        .create(true)
        .write(true)
        .append(true) // Append to keep history until manual clear
        .open(log_path)
        .with_context(|| format!("Failed to open log file: {}", log_path.display()))?;

    let logger = Box::new(FileLogger {
        file: Mutex::new(file),
    });

    log::set_boxed_logger(logger)
        .map(|()| log::set_max_level(level))
        .map_err(|e| anyhow::anyhow!("Failed to set logger: {}", e))?;

    log::info!("Logger initialized. Level: {}", level);
    Ok(())
}

fn is_writable_tmpfs(path: &Path) -> bool {
    if !path.is_dir() {
        log::debug!("  {} is not a directory", path.display());
        return false;
    }

    if let Ok(mounts) = std::fs::read_to_string("/proc/mounts") {
        let path_str = path.to_string_lossy();
        let is_tmpfs = mounts.lines().any(|line| {
            let parts: Vec<&str> = line.split_whitespace().collect();
            parts.len() >= 3 && parts[1] == path_str && parts[2] == "tmpfs"
        });

        if !is_tmpfs {
            log::debug!("  {} is not a tmpfs", path.display());
            return false;
        }
        log::debug!("  {} is a tmpfs", path.display());
    } else {
        log::debug!("  failed to read /proc/mounts");
    }

    let test_file = path.join(format!(".mm_test_{}", std::process::id()));
    let writable = write(&test_file, b"test").is_ok();

    if writable {
        let _ = remove_file(&test_file);
        log::debug!("  {} is writable", path.display());
    } else {
        log::debug!("  {} is not writable", path.display());
    }

    writable
}

pub fn select_temp_dir() -> Result<PathBuf> {
    log::debug!("searching for suitable tmpfs mount point...");

    for candidate in TMPFS_CANDIDATES {
        let path = Path::new(candidate);
        log::debug!("checking tmpfs candidate: {}", path.display());

        if is_writable_tmpfs(path) {
            let temp_dir = path.join(TEMP_DIR_SUFFIX);
            log::info!(
                "selected tmpfs: {} -> {}",
                path.display(),
                temp_dir.display()
            );
            return Ok(temp_dir);
        }
    }

    bail!(
        "no writable tmpfs found in candidates: {}",
        TMPFS_CANDIDATES.join(", ")
    )
}

pub fn ensure_temp_dir(temp_dir: &Path) -> Result<()> {
    if temp_dir.exists() {
        log::debug!("cleaning existing temp dir: {}", temp_dir.display());
        remove_dir_all(temp_dir)
            .with_context(|| format!("failed to clean temp dir {temp_dir:?}"))?;
    }

    create_dir_all(temp_dir).with_context(|| format!("failed to create temp dir {temp_dir:?}"))?;

    log::debug!("temp dir ready: {}", temp_dir.display());
    Ok(())
}

pub fn cleanup_temp_dir(temp_dir: &Path) {
    if let Err(e) = remove_dir_all(temp_dir) {
        log::warn!(
            "failed to clean up temp dir {}: {:#}",
            temp_dir.display(),
            e
        );
    } else {
        log::debug!("cleaned up temp dir: {}", temp_dir.display());
    }
}
