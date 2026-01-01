use std::{os::fd::RawFd, sync::OnceLock};

pub mod try_umount;

pub fn check_ksu() -> bool {
    ksu::version().is_some_and(|v| {
        log::info!("KernelSU Version: {v}");
        true
    })
}
