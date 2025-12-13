use std::{
    ffi::{CString, c_char, c_int},
    fs::OpenOptions,
    io,
    os::fd::{AsRawFd, RawFd},
    path::Path,
    sync::OnceLock,
};

use anyhow::Result;
use rustix::path::Arg;

const HYMO_IOC_MAGIC: u32 = 0xE0;
const HYMO_IOCTL_HIDE: u64 = ioctl_cmd_write(3, std::mem::size_of::<HymoHide>());
pub(super) const HYMO_DEV: &[&str] = &["/dev/hymo_ctl", "/proc/hymo_ctl"];
static DRIVER_FD: OnceLock<RawFd> = OnceLock::new();

#[repr(C)]
struct HymoHide {
    src: *const c_char,
    target: *const c_char,
    r#type: c_int,
}

const fn ioctl_cmd_write(nr: u32, size: usize) -> u64 {
    let size = size as u64;
    (1u32 << 30) as u64 | (size << 16) | ((HYMO_IOC_MAGIC as u64) << 8) | nr as u64
}

pub(super) fn send_hide_hymofs<P>(target: P) -> Result<()>
where
    P: AsRef<Path>,
{
    let fd = *DRIVER_FD.get_or_init(|| {
        let mut fd = -1;
        for i in HYMO_DEV {
            if let Ok(dev) = OpenOptions::new().read(true).write(true).open(i) {
                fd = dev.as_raw_fd();
            }
        }
        fd
    });

    let path = CString::new(target.as_ref().as_str()?)?;
    let cmd = HymoHide {
        src: path.as_ptr(),
        target: std::ptr::null(),
        r#type: 0,
    };

    let ret = unsafe {
        #[cfg(not(target_env = "gnu"))]
        {
            libc::ioctl(fd, HYMO_IOCTL_HIDE as i32, &cmd)
        }
        #[cfg(target_env = "gnu")]
        {
            libc::ioctl(fd, HYMO_IOCTL_HIDE, &cmd)
        }
    };
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
