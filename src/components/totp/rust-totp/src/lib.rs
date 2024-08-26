use js_sys::Date;
use wasm_bindgen::prelude::*;
use hmac::{Hmac, Mac};
use sha1::Sha1;
use sha2::{Sha256, Sha512};
use base32::{Alphabet, decode as base32_decode};
use serde::{Deserialize, Serialize};
use tsify::Tsify;

type HmacSha1 = Hmac<Sha1>;
type HmacSha256 = Hmac<Sha256>;
type HmacSha512 = Hmac<Sha512>;

#[wasm_bindgen]
pub enum Algorithm {
    SHA1,
    SHA256,
    SHA512,
}

#[wasm_bindgen]
pub struct TOTP {
    secret: Vec<u8>,
    digits: usize,
    step: u64,
    t0: u64,
    algorithm: Algorithm,
}

#[derive(Tsify, Serialize, Deserialize)]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct TOTPSteps {
    current_time: u64,
    time_step: u64,
    secret_bytes: String,
    time_bytes: String,
    hmac_input: String, 
    hmac_result: String,
    offset: usize,
    binary: u32,
    otp_int: u32,
    otp: String,
}

#[wasm_bindgen]
impl TOTP {
    #[wasm_bindgen(constructor)]
    pub fn new(secret: &[u8], digits: usize, algorithm: Algorithm) -> Self {
        TOTP {
            secret: secret.to_vec(),
            digits,
            step: 30,
            t0: 0,
            algorithm,
        }
    }

    #[wasm_bindgen]
    pub fn from_base32(secret: &str, digits: usize, algorithm: Algorithm) -> Result<TOTP, JsValue> {
        let decoded = base32_decode(Alphabet::Rfc4648 { padding: false }, secret)
            .ok_or_else(|| JsValue::from_str("Invalid Base32 secret"))?;
        
        Ok(TOTP {
            secret: decoded,
            digits,
            step: 30,
            t0: 0,
            algorithm,
        })
    }

    #[wasm_bindgen]
    pub fn with_step(mut self, step: u64) -> Self {
        self.step = step;
        self
    }

    #[wasm_bindgen]
    pub fn with_t0(mut self, t0: u64) -> Self {
        self.t0 = t0;
        self
    }

    #[wasm_bindgen]
    pub fn generate(&self) -> String {
        let current_time = (Date::now() / 1000.0) as u64;
        self.generate_internal(current_time).otp
    }
    
    #[wasm_bindgen(js_name = generateWithSteps)]
    pub fn generate_with_steps(&self) -> TOTPSteps {
        let current_time = (Date::now() / 1000.0) as u64;
        self.generate_internal(current_time)
    }

    fn generate_internal(&self, current_time: u64) -> TOTPSteps {
        let time_step = (current_time - self.t0) / self.step;
        let time_bytes = time_step.to_be_bytes();
        
        // Merge secret and time bytes for HMAC input
        let mut hmac_input = self.secret.clone();
        hmac_input.extend_from_slice(&time_bytes);

        let hmac_result = match self.algorithm {
            Algorithm::SHA1 => {
                let mut mac = HmacSha1::new_from_slice(&self.secret).unwrap();
                mac.update(&time_bytes);
                mac.finalize().into_bytes().to_vec()
            },
            Algorithm::SHA256 => {
                let mut mac = HmacSha256::new_from_slice(&self.secret).unwrap();
                mac.update(&time_bytes);
                mac.finalize().into_bytes().to_vec()
            },
            Algorithm::SHA512 => {
                let mut mac = HmacSha512::new_from_slice(&self.secret).unwrap();
                mac.update(&time_bytes);
                mac.finalize().into_bytes().to_vec()
            },
        };

        let offset = (hmac_result[hmac_result.len() - 1] & 0xf) as usize;
        let binary = ((hmac_result[offset] & 0x7f) as u32) << 24
            | (hmac_result[offset + 1] as u32) << 16
            | (hmac_result[offset + 2] as u32) << 8
            | (hmac_result[offset + 3] as u32);

        let otp_int = binary % 10u32.pow(self.digits as u32);
        let otp_string = format!("{:0>width$}", otp_int, width = self.digits);

        TOTPSteps {
            current_time,
            time_step,
            secret_bytes: hex::encode(&self.secret),
            time_bytes: hex::encode(time_bytes),
            hmac_input: hex::encode(&hmac_input),
            hmac_result: hex::encode(&hmac_result),
            offset,
            binary,
            otp_int,
            otp: otp_string,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_totp_sha1() {
        let secret = "12345678901234567890".as_bytes();
        let totp = TOTP::new(secret, 8, Algorithm::SHA1);
        
        assert_eq!(totp.generate_internal(59).otp, "94287082");
        assert_eq!(totp.generate_internal(1111111109).otp, "07081804");
        assert_eq!(totp.generate_internal(1111111111).otp, "14050471");
        assert_eq!(totp.generate_internal(1234567890).otp, "89005924");
        assert_eq!(totp.generate_internal(2000000000).otp, "69279037");
        assert_eq!(totp.generate_internal(20000000000).otp, "65353130");
    }

    #[test]
    fn test_totp_sha256() {
        let secret = "12345678901234567890123456789012".as_bytes();
        let totp = TOTP::new(secret, 8, Algorithm::SHA256);
        
        assert_eq!(totp.generate_internal(59).otp, "46119246");
        assert_eq!(totp.generate_internal(1111111109).otp, "68084774");
        assert_eq!(totp.generate_internal(1111111111).otp, "67062674");
        assert_eq!(totp.generate_internal(1234567890).otp, "91819424");
        assert_eq!(totp.generate_internal(2000000000).otp, "90698825");
        assert_eq!(totp.generate_internal(20000000000).otp, "77737706");
    }

    #[test]
    fn test_totp_sha512() {
        let secret = "1234567890123456789012345678901234567890123456789012345678901234".as_bytes();
        let totp = TOTP::new(secret, 8, Algorithm::SHA512);
        
        assert_eq!(totp.generate_internal(59).otp, "90693936");
        assert_eq!(totp.generate_internal(1111111109).otp, "25091201");
        assert_eq!(totp.generate_internal(1111111111).otp, "99943326");
        assert_eq!(totp.generate_internal(1234567890).otp, "93441116");
        assert_eq!(totp.generate_internal(2000000000).otp, "38618901");
        assert_eq!(totp.generate_internal(20000000000).otp, "47863826");
    }
}
