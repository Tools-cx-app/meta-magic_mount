## v0.2.2-Hybrid-g10badc0

Changes since v0.2.1:
* 	modified:   src/magic_mount/try_umount.rs
* 	modified:   module/module.prop
* [skip ci] Edit release.yml
* feat:Add SuSFS support
* 	modified:   module/metamount.sh 	modified:   webui/src/App.svelte 	modified:   webui/src/app.css
* [skip ci] Update KernelSU json and changelog for v0.2.2-Hybrid
* 	modified:   webui/src/App.svelte
* 	modified:   src/main.rs
* 	new file:   .github/workflows/release.yml 	modified:   src/utils.rs
* 	modified:   webui/src/App.svelte 	modified:   webui/src/app.css
*     modified:   .github/workflows/build.yml 	modified:   xbuild/src/main.rs
* 	modified:   .github/workflows/build.yml 	modified:   xbuild/src/main.rs
* 	modified:   src/defs.rs 	modified:   src/magic_mount/mod.rs 	modified:   src/main.rs 	modified:   src/overlay_mount.rs 	modified:   xbuild/src/main.rs
*     modified:   src/defs.rs 	modified:   src/magic_mount/mod.rs 	modified:   src/magic_mount/node.rs 	modified:   src/overlay_mount.rs
* 	modified:   Cargo.toml
* 	modified:   .github/workflows/build.yml
* 	modified:   xbuild/src/main.rs
* 	modified:   webui/src/app.css
* 	new file:   .github/workflows/build.yml 	deleted:    .github/workflows/ci.yml
* 	modified:   Cargo.toml 	modified:   module/metauninstall.sh 	modified:   module/uninstall.sh
* 	modified:   Cargo.toml 	modified:   module/customize.sh 	modified:   module/metainstall.sh 	modified:   module/metamount.sh 	modified:   src/config.rs 	new file:   src/defs.rs 	modified:   src/magic_mount/mod.rs 	modified:   src/main.rs 	new file:   src/overlay_mount.rs 	modified:   webui/src/App.svelte 	modified:   webui/src/locate.json 	modified:   xbuild/src/main.rs
* 	modified:   module/module.prop
* feat: add magic mount
* docs: update
* refactor: Use a file-splitting structure -  This converts magic_mount from a single file into multiple files, making it easier to modify and read.
* fix: fix complete && feat: add fmt::Display for Node && NodeFileType
* fix: collect extra partitions: `<module>/<part>/` instead of `<module>/system/<part>/`
* bump to 0.2.2
* fix: add fallback support for .replace marker file
* feat: use cache to save fd To avoid the kernel being unable to add more due to the anon inode limit.
* dependabot: add xbuild && webui
* chore: remove unused code
* fix: webui modules bugs
* fix(xbuild): fix no release build
* [test] test ci
* fix(xbuild): fix no build magic_mount_rs
* refactor(ci): add `xbuild` workspace * ci use cargo xbuild
* feat: use config::CONFIG_FILE_DEFAULT for main
* chore: update module name to `Magic Mount - Rust`
* fix: fix no mount
* chore: update module.prop
* fix: fix log file is empty