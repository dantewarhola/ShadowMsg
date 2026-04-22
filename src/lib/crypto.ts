import nacl from 'tweetnacl';
import {
  encodeBase64,
  decodeBase64,
  encodeUTF8,
  decodeUTF8,
} from 'tweetnacl-util';

/**
 * Derive a 32-byte symmetric key from a password via SHA-256.
 */
export async function deriveKeyFromPassword(password: string): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', enc.encode(password));
  return new Uint8Array(hashBuffer);
}

/**
 * Encrypt a UTF-8 string with XSalsa20-Poly1305.
 */
export function encryptMessage(
  message: string,
  key: Uint8Array
): { cipher: string; nonce: string } {
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
  const box = nacl.secretbox(decodeUTF8(message), nonce, key);
  return {
    cipher: encodeBase64(box),
    nonce: encodeBase64(nonce),
  };
}

/**
 * Decrypt an XSalsa20-Poly1305 ciphertext back to a UTF-8 string.
 */
export function decryptMessage(
  cipherB64: string,
  nonceB64: string,
  key: Uint8Array
): string {
  const cipher = decodeBase64(cipherB64);
  const nonce = decodeBase64(nonceB64);
  const msg = nacl.secretbox.open(cipher, nonce, key);
  if (!msg) throw new Error('Decryption failed');
  return encodeUTF8(msg);
}
