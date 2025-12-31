use std::{ffi::CString, io, path::Path};

use anyhow::Result;
use rustix::path::Arg;

use crate::ksu::{get_fd, magic::KSU_IOCTL_ADD_TRY_UMOUNT};

#[repr(C)]
struct KsuAddTryUmount {
    arg: u64,
    flags: u32,
    mode: u8,
}

pub(super) fn send_kernel_umount<P>(target: P) -> Result<()>
where
    P: AsRef<Path>,
{
    let path = CString::new(target.as_ref().as_str()?)?;
    let cmd = KsuAddTryUmount {
        arg: path.as_ptr() as u64,
        flags: 2,
        mode: 1,
    };

    let fd = get_fd();

    let ret = unsafe { libc::ioctl(fd as libc::c_int, KSU_IOCTL_ADD_TRY_UMOUNT, &cmd) };

    if ret < 0 {
        log::error!(
            "umount {} failed: {}",
            target.as_ref().display(),
            io::Error::last_os_error()
        );

        return Ok(());
    }

    log::info!("umount {} successful!", target.as_ref().display());
    Ok(())
}
