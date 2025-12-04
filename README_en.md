<div align="center">

# Magic Mount Metamodule

[![Telegram][telegram-badge]][telegram-url]
</div>

[telegram-badge]: https://img.shields.io/badge/Group-blue\?style\=for-the-badge\&logo\=telegram\&label\=Telegram
[telegram-url]: https://t.me/mmrs_ci

Provide systemless mount capabilities for KernelSU.

The author will update this project less frequently due to academic commitments.

---

## Configuration

Configuration file path:

`/data/adb/magic_mount/config.toml`

Example:

```toml
moduledir = "/data/adb/modules/"
mountsource = "KSU"
verbose = false
umount = false
partitions = []
```

| Field | Description |
| ------------- | -------------- |
| `moduledir` | Systemless module directory used to scan and load module contents to be mounted. |
| `mountsource` | Identifier for the Systemless mount source. Default is `"KSU"` to match KernelSU behavior. |
| `verbose` | Whether to output debug logs. `true` will show detailed mount information. |
| `umount` | Whether to attempt unmount (depends on KernelSU's umount). |
| `partitions` | A list of specific partitions to perform Systemless operations on, e.g. `"mi_ext"`, `"my_stock"`. |

Configuration can also be performed via the Web UI (recommended).

---

## Development

Dependencies:

* Rust nightly toolchain
* Android NDK
* `cargo-ndk`
* Node.js / npm

Environment variables:

```shell
export ANDROID_NDK_HOME=<path/to/ndk>
export ANDROID_NDK_ROOT=$ANDROID_NDK_HOME
```

Build:

```shell
cargo xtask b
```

Build artifacts will be located at:

* `output/magic_mount_rs.zip`

## Acknowledgements

* [5ec1cff/KernelSU](https://github.com/5ec1cff/KernelSU/blob/52f1f575ce2bd0ca46ebf644fd00a838af9f344e/userspace/ksud/src/magic_mount.rs): original implementation
* [YuzakiKokuban](https://github.com/YuzakiKokuban) Webui modifications

## License

* [GPL-3.0 license](https://www.gnu.org/licenses/gpl-3.0.html)
