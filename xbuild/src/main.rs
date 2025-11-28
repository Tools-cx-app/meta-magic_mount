mod zip_ext;

use std::{
    fs,
    path::{Path, PathBuf},
    process::Command,
};

use anyhow::Result;
use fs_extra::{dir, file};
use zip::{CompressionMethod, write::FileOptions};

use crate::zip_ext::zip_create_from_directory_with_options;

fn main() -> Result<()> {
    let temp_dir = temp_dir();

    let _ = fs::remove_dir_all(&temp_dir);
    fs::create_dir_all(&temp_dir)?;

    build_webui()?;

    let mut cargo = cargo_ndk();
    let args = vec![
        "build",
        "--target",
        "aarch64-linux-android",
        "-Z",
        "build-std",
        "-Z",
        "trim-paths",
        "-r",
    ];

    cargo.args(args);

    cargo.spawn()?.wait()?;

    let module_dir = module_dir();
    dir::copy(
        &module_dir,
        &temp_dir,
        &dir::CopyOptions::new().overwrite(true).content_only(true),
    )
    .unwrap();
    
    if temp_dir.join(".gitignore").exists() {
        fs::remove_file(temp_dir.join(".gitignore")).unwrap();
    }

    file::copy(
        bin_path(),
        temp_dir.join("magic_mount_rs"),
        &file::CopyOptions::new().overwrite(true),
    )?;

    let options: FileOptions<'_, ()> = FileOptions::default()
        .compression_method(CompressionMethod::Deflated)
        .compression_level(Some(9));
    zip_create_from_directory_with_options(
        &Path::new("output").join("magic_mount_rs.zip"),
        &temp_dir,
        |_| options,
    )
    .unwrap();

    Ok(())
}

fn module_dir() -> PathBuf {
    Path::new("module").to_path_buf()
}

fn temp_dir() -> PathBuf {
    Path::new("output").join(".temp")
}

fn bin_path() -> PathBuf {
    Path::new("target")
        .join("aarch64-linux-android")
        .join("release")
        .join("magic_mount_rs")
}
fn cargo_ndk() -> Command {
    let mut command = Command::new("cargo");
    command
        .args(["+nightly", "ndk", "--platform", "31", "-t", "arm64-v8a"])
        .env("RUSTFLAGS", "-C default-linker-libraries")
        .env("CARGO_CFG_BPF_TARGET_ARCH", "aarch64");
    command
}

fn build_webui() -> Result<()> {
    let npm = || {
        let mut command = Command::new("npm");
        command.current_dir("webui");
        command
    };

    npm().arg("install").spawn()?.wait()?;
    npm().args(["run", "build"]).spawn()?.wait()?;

    Ok(())
}
