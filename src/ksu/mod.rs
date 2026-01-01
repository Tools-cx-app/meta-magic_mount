// Copyright 2025 Magic Mount-rs Authors
// SPDX-License-Identifier: GPL-3.0-or-later

pub mod try_umount;

pub fn check_ksu() -> bool {
    ksu::version().is_some_and(|v| {
        log::info!("KernelSU Version: {v}");
        true
    })
}
