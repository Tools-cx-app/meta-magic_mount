#!/system/bin/sh

if [ -z $KSU ]; then
  abort "only support KernelSU!!"
fi

ui_print "- Detecting device architecture..."

ABI=$(getprop ro.product.cpu.abi)

if [ -z "$ABI" ]; then
  abort "! Failed to detect device architecture"
fi

ui_print "  Detected ABI: $ABI"

case "$ABI" in
arm64-v8a)
  ui_print "  ✓ Selected architecture: ARM64"
  ARCH_BINARY="magic_mount_rs.aarch64"
  ;;
x86_64)
  ui_print "  ✓ Selected architecture: x86_64"
  ARCH_BINARY="magic_mount_rs.x64"
  ;;
armeabi-v7a)
  ui_print "  ✓ Selected architecture: ARMv7"
  ARCH_BINARY="magic_mount_rs.armv7"
  ;;
*)
  abort "! Unsupported architecture: $ABI"
  ;;
esac

ui_print "- Installing architecture-specific binary"

# Rename the selected binary to the generic name
mv "$MODPATH/bin/$ARCH_BINARY" "$MODPATH/meta-mm" || abort "! Failed to rename binary"
rm -rf "$MODPATH/bin"

# Ensure the binary is executable
chmod 755 "$MODPATH/meta-mm" && chmod 755 "$MODPATH/daemonize-mmrs" || abort "! Failed to set permissions"

ui_print "- Architecture-specific binary installed successfully"

mkdir -p /data/adb/magic_mount

if [ ! -f /data/adb/magic_mount/config.toml ]; then
  ui_print "- Add default config"
  cat "$MODPATH/config.toml" >/data/adb/magic_mount/config.toml
fi

ui_print "- Installation complete"
ui_print "- Image is ready for module installations"
