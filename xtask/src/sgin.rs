use std::{
    fs,
    io::{Read, Write},
    path::{Path, PathBuf},
};

use anyhow::Result;
use ed25519_dalek::{SigningKey, ed25519::signature::SignerMut};
use sha2::{Digest, Sha256};

const SIGNATURE_FILE: &str = "keys";

pub struct Signer {
    key: SigningKey,
    dir: PathBuf,
}

impl Signer {
    pub fn new<P>(dir: P, key: &[u8; 32]) -> Result<Self>
    where
        P: AsRef<Path>,
    {
        Ok(Self {
            key: SigningKey::from_bytes(&key),
            dir: dir.as_ref().to_path_buf(),
        })
    }

    pub fn sign_files(&mut self, file_names: &[&str]) -> Result<()> {
        if file_names.is_empty() {
            return Err(anyhow::format_err!("No found any files"));
        }

        let mut sorted_names = file_names.to_vec();
        sorted_names.sort();

        let total_hash = self.calculate_total_hash(&sorted_names)?;

        let signature = self.key.sign(&total_hash);

        let sig_path = self.dir.join(SIGNATURE_FILE);
        let mut file = fs::File::create(sig_path)?;
        file.write_all(&total_hash)?;
        file.write_all(&signature.to_bytes())?;

        println!("sgin success!!");

        Ok(())
    }

    fn calculate_total_hash(&self, file_names: &[&str]) -> Result<Vec<u8>> {
        let mut total_hash = vec![0u8; 32];

        for file_name in file_names {
            let file_path = self.dir.join(file_name);

            if !file_path.exists() || !file_path.is_file() {
                return Err(anyhow::format_err!("files not found: {:?}", file_path).into());
            }

            let file_hash = self.sha256_file(&file_path)?;

            xor_bytes(&mut total_hash, &file_hash);
        }

        Ok(total_hash)
    }

    fn sha256_file(&self, path: &Path) -> Result<Vec<u8>> {
        let mut file = fs::File::open(path)?;
        let mut hasher = Sha256::new();
        let mut buffer = [0u8; 8192];

        loop {
            let n = file.read(&mut buffer)?;
            if n == 0 {
                break;
            }
            hasher.update(&buffer[..n]);
        }

        Ok(hasher.finalize().to_vec())
    }
}

fn xor_bytes(dest: &mut [u8], src: &[u8]) {
    for (d, s) in dest.iter_mut().zip(src.iter()) {
        *d ^= s;
    }
}
