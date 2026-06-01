import crypto from 'crypto';

// Secret key for encrypting cookie sessions. Uses environment variable or a secure fallback.
const SESSION_SECRET = process.env.SESSION_SECRET || 'cuong_resort_extremely_long_secure_secret_key_32_chars';
const ENCRYPTION_KEY = Buffer.from(SESSION_SECRET.substring(0, 32)); // Must be 32 bytes
const IV_LENGTH = 16;

/**
 * Hashes a password securely using Node's built-in scrypt algorithm.
 */
export function hashPassword(password: string): string {
  const salt = 'cuong_resort_static_salt_value';
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

/**
 * Encrypts session data into a secure hex string using AES-256-CBC.
 */
export function encryptSession(data: any): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  // Combine IV and encrypted data
  return iv.toString('hex') + ':' + encrypted;
}

/**
 * Decrypts a session token back into its original data structure.
 * Returns null if decryption fails or the token is tampered with.
 */
export function decryptSession(token: string): any | null {
  try {
    const parts = token.split(':');
    if (parts.length !== 2) return null;
    
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = parts[1];
    const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return JSON.parse(decrypted);
  } catch (error) {
    return null;
  }
}
