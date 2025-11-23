# Magic Mount Metamodule
[![Latest Release](https://img.shields.io/github/v/release/7a72/meta-magic_mount?label=Latest%20Release)](https://github.com/7a72/meta-magic_mount/releases/latest)
[![Latest CI](https://img.shields.io/badge/Latest%20CI-Build-orange)](https://nightly.link/7a72/meta-magic_mount/workflows/compile/main)

Implement systemless modification support for KernelSU.

## Support Policy

This project **only provides support for the official KSU branch**.
No compatibility guarantees or technical support will be offered for unofficial forks, third-party modifications, or derivative versions.

## Build Instructions

To build this project, you must have the following installed:

* **Node.js**
* **pnpm**
* **Zig**

### 1. Build WebUI

```bash
cd webui
pnpm i
pnpm build
```

### 2. Build Module

```bash
bash build.sh --release
```

### 3. Build Output

Build artifacts will be generated under:

```
build/
```

## Misc

The branch now uses a **C implementation**.

The previous **Rust implementation** is still available in a separate branch for reference:

Rust branch: `rust`

You can switch to the Rust version with:

```bash
git checkout rust
```
