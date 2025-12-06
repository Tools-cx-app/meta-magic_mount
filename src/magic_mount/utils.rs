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
