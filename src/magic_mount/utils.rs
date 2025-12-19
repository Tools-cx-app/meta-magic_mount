use std::path::Path;

use crate::magic_mount::node::{Node, NodeFileType};

pub fn check_tmpfs<P>(node: &mut Node, path: P) -> (Node, bool)
where
    P: AsRef<Path>,
{
    let mut ret_tmpfs = false;
    for it in &mut node.children {
        let (name, node) = it;
        let real_path = path.as_ref().join(name);
        let need = match node.file_type {
            NodeFileType::Symlink => true,
            NodeFileType::Whiteout => real_path.exists(),
            _ => {
                if let Ok(metadata) = real_path.symlink_metadata() {
                    let file_type = NodeFileType::from(metadata.file_type());
                    file_type != node.file_type || file_type == NodeFileType::Symlink
                } else {
                    // real path not exists
                    true
                }
            }
        };
        if need {
            if node.module_path.is_none() {
                log::error!(
                    "cannot create tmpfs on {}, ignore: {name}",
                    path.as_ref().display()
                );
                node.skip = true;
                continue;
            }
            ret_tmpfs = true;
            break;
        }
    }

    (node.clone(), ret_tmpfs)
}

pub fn collect_module_files(module_dir: &Path, extra_partitions: &[String]) -> Result<Option<Node>> {
    let mut root = Node::new_root("");
    let mut system = Node::new_root("system");
    let module_root = module_dir;
    let mut has_file = false;

    for entry in module_root.read_dir()?.flatten() {
        if !entry.file_type()?.is_dir() {
            continue;
        }

        {
            let prop = entry.path().join("module.prop");
            let string = fs::read_to_string(prop)?;
            for line in string.lines() {
                if line.starts_with("id")
                    && let Some((_, value)) = line.split_once('=')
                {
                    validate_module_id(value)?;
                }
            }
        }

        if entry.path().join(DISABLE_FILE_NAME).exists()
            || entry.path().join(REMOVE_FILE_NAME).exists()
            || entry.path().join(SKIP_MOUNT_FILE_NAME).exists()
        {
            continue;
        }

        let mod_system = entry.path().join("system");
        if !mod_system.is_dir() {
            continue;
        }

        log::debug!("collecting {}", entry.path().display());

        has_file |= system.collect_module_files(&mod_system)?;
    }

    if has_file {
        const BUILTIN_PARTITIONS: [(&str, bool); 4] = [
            ("vendor", true),
            ("system_ext", true),
            ("product", true),
            ("odm", false),
        ];

        for (partition, require_symlink) in BUILTIN_PARTITIONS {
            let path_of_root = Path::new("/").join(partition);
            let path_of_system = Path::new("/system").join(partition);
            if path_of_root.is_dir() && (!require_symlink || path_of_system.is_symlink()) {
                let name = partition.to_string();
                if let Some(node) = system.children.remove(&name) {
                    root.children.insert(name, node);
                }
            }
        }

        for partition in extra_partitions {
            if BUILTIN_PARTITIONS.iter().any(|(p, _)| p == partition) {
                continue;
            }
            if partition == "system" {
                continue;
            }

            let path_of_root = Path::new("/").join(partition);
            let path_of_system = Path::new("/system").join(partition);
            let require_symlink = false;

            if path_of_root.is_dir() && (!require_symlink || path_of_system.is_symlink()) {
                let name = partition.clone();
                if let Some(node) = system.children.remove(&name) {
                    log::debug!("attach extra partition '{name}' to root");
                    root.children.insert(name, node);
                }
            }
        }

        root.children.insert("system".to_string(), system);
        Ok(Some(root))
    } else {
        Ok(None)
    }
}
