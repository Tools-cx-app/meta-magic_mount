# **Meta-Hybrid Mount**

A Hybrid Mount metamodule for KernelSU/Magisk, implementing both OverlayFS and Magic Mount logic via a native Rust binary.

这是一个用于 KernelSU/Magisk 的混合挂载 (Hybrid Mount) 元模块，通过原生 Rust 二进制文件实现了 OverlayFS 和 Magic Mount 逻辑。
基于俺寻思和Vibe Coding。

## **English**

### **Core Architecture**

* **Hybrid Engine**:  
  * **Logic**: Written in Rust using rustix for direct syscalls.  
  * **Mechanism**: Automatically scans modules and mounts them using **OverlayFS** (default) or **Magic Mount** (legacy recursive bind mount) based on per-module configuration.  
  * **Fallback**: Can fallback to Magic Mount if OverlayFS fails for specific partitions.  
* **Storage Isolation**:  
  * Creates and mounts a 2GB ext4 loop image (modules.img) at /data/adb/meta-hybrid/mnt.  
  * This provides a standard ext4 environment for module files, ensuring OverlayFS upperdir/workdir compatibility regardless of the underlying /data filesystem (e.g., F2FS).  
* **Stealth**:  
  * Implements try\_umount logic for **KernelSU** to detach mount points in the global namespace.  
  * **SUSFS** (via prctl) to register mount points for hiding if the kernel supports it.

### **Features**

* **Per-Module Configuration**: Toggle specific modules between "Auto" (OverlayFS) and "Magic" (Bind Mount) modes.  
* **WebUI**: A Svelte 5 \+ Vite frontend running in WebView, communicating with the daemon via KSU JavaScript API to manage configurations.  
* **Logging**: Detailed daemon logs at /data/adb/meta-hybrid/daemon.log.

### **Build**

**Requirements**:

* Rust (Nightly toolchain recommended for Android targets)  
* Node.js & npm  
* Android NDK (r26+)

## **中文 (Chinese)**

### **核心架构**

* **混合引擎**:  
  * **逻辑**: 使用 Rust 编写，利用 rustix 进行直接系统调用。  
  * **机制**: 自动扫描模块，并根据逐模块的配置选择使用 **OverlayFS**（默认）或 **Magic Mount**（传统递归绑定挂载）。  
  * **回退**: 如果 OverlayFS 在特定分区挂载失败，可自动回退至 Magic Mount。  
* **存储隔离**:  
  * 在 /data/adb/meta-hybrid/mnt 挂载一个 2GB 的 ext4 loop 镜像 (modules.img)。  
  * 这为模块文件提供了标准的 ext4 环境，确保 OverlayFS 的 upperdir/workdir 在任何底层 /data 文件系统（如 F2FS）上都能正常工作。  
* **隐藏机制**:  
  * 实现了 **KernelSU** 的 try\_umount 逻辑，在全局命名空间中分离挂载点。  
  * **SUSFS** 支持（通过 prctl），如果内核支持，可注册挂载点以进行隐藏。

### **特性**

* **逐模块配置**: 可将特定模块在 "自动" (OverlayFS) 和 "Magic" (绑定挂载) 模式间切换。  
* **WebUI**: 基于 Svelte 5 \+ Vite 的前端，运行在 WebView 中，通过 KSU JavaScript API 与守护进程通信以管理配置。  
* **日志**: 守护进程日志位于 /data/adb/meta-hybrid/daemon.log。

### **构建**

**环境要求**:

* Rust (建议使用 Nightly 工具链以支持 Android 目标)  
* Node.js & npm  
* Android NDK (r26+)

## **License**

GPL-3.0
