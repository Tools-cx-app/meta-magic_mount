// Copyright 2025 Magic Mount-rs Authors
// SPDX-License-Identifier: GPL-3.0-or-later

use std::{
    fs,
    path::Path,
    sync::{LazyLock, Mutex, OnceLock, atomic::AtomicBool},
};

use ksu::TryUmount;

use crate::defs::{DISABLE_FILE_NAME, REMOVE_FILE_NAME, SKIP_MOUNT_FILE_NAME};

static LAST: AtomicBool = AtomicBool::new(false);
pub static TMPFS: OnceLock<String> = OnceLock::new();
pub static LIST: LazyLock<Mutex<TryUmount>> = LazyLock::new(|| Mutex::new(TryUmount::new()));

pub fn send_unmountable<P>(target: P)
where
    P: AsRef<Path>,
{
    if !super::KSU.load(std::sync::atomic::Ordering::Relaxed) {
        return;
    }

    if LAST.load(std::sync::atomic::Ordering::Relaxed) {
        return;
    }

    let path = Path::new("/data/adb/modules/zygisksu");
    let disabled = path.join(DISABLE_FILE_NAME).exists() || path.join(REMOVE_FILE_NAME).exists();
    let skip = path.join(SKIP_MOUNT_FILE_NAME).exists();
    if disabled || skip {
        return;
    }

    if let Ok(s) = fs::read_to_string("/data/adb/zygisksu/denylist_enforce")
        && s.trim() != "0"
        && TMPFS.get().is_some_and(|s| s.trim() == "/debug_ramdisk")
    {
        log::warn!("zn was detected, and try_umount was cancelled.");
        LAST.store(true, std::sync::atomic::Ordering::Relaxed);
        return;
    }

    LIST.lock().unwrap().add(target);
}
