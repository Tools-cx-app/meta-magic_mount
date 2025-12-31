use std::{os::fd::RawFd, sync::OnceLock};

use crate::ksu::magic::{KSU_INSTALL_MAGIC1, KSU_INSTALL_MAGIC2};

pub mod info;
pub mod magic;
pub mod try_umount;

pub fn check_ksu() -> bool {
    info::version().is_some_and(|v| {
        log::info!("KernelSU Version: {v}");
        true
    })
}

static DRIVER_FD: OnceLock<RawFd> = OnceLock::new();

pub fn get_fd() -> RawFd {
    *DRIVER_FD.get_or_init(|| {
        let mut fd = -1;
        unsafe {
            libc::syscall(
                libc::SYS_reboot,
                KSU_INSTALL_MAGIC1,
                KSU_INSTALL_MAGIC2,
                0,
                &mut fd,
            );
        };
        fd
    })
}
