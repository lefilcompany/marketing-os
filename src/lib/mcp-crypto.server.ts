// AES-GCM encryption for MCP OAuth tokens.
// Layout of stored bytes (base64 in bytea column):
//   [1 byte version=0x01][12 bytes nonce][ciphertext+tag]
// Reads a base64 32-byte key from MCP_TOKEN_ENCRYPTION_KEY.

const VERSION = 1;

let cachedKey: Promise<CryptoKey> | null = null;

function b64ToBytes(b64: string): Uint8Array {
  const s = b64.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToB64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

async function getKey(): Promise<CryptoKey> {
  if (!cachedKey) {
    cachedKey = (async () => {
      const raw = process.env.MCP_TOKEN_ENCRYPTION_KEY;
      if (!raw) throw new Error("MCP_TOKEN_ENCRYPTION_KEY não configurado");
      // Accept either raw base64 (32 bytes) or a 32+ char string; hash to 32 bytes if not b64.
      let keyBytes: Uint8Array;
      try {
        keyBytes = b64ToBytes(raw);
        if (keyBytes.length !== 32) throw new Error("wrong length");
      } catch {
        const digest = await crypto.subtle.digest(
          "SHA-256",
          new TextEncoder().encode(raw) as unknown as ArrayBuffer,
        );
        keyBytes = new Uint8Array(digest);
      }
      return crypto.subtle.importKey(
        "raw",
        keyBytes as unknown as ArrayBuffer,
        "AES-GCM",
        false,
        ["encrypt", "decrypt"],
      );

    })();
  }
  return cachedKey;
}

/** Encrypts a string; returns base64 (safe for bytea column via supabase-js). */
export async function encryptToken(plaintext: string): Promise<string> {
  const key = await getKey();
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: nonce },
      key,
      new TextEncoder().encode(plaintext),
    ),
  );
  const out = new Uint8Array(1 + nonce.length + ct.length);
  out[0] = VERSION;
  out.set(nonce, 1);
  out.set(ct, 1 + nonce.length);
  return bytesToB64(out);
}

/** Decrypts a base64 payload produced by encryptToken. */
export async function decryptToken(b64: string): Promise<string> {
  const key = await getKey();
  const raw = b64ToBytes(b64);
  if (raw.length < 1 + 12 + 16) throw new Error("Payload de token inválido");
  if (raw[0] !== VERSION) throw new Error("Versão de criptografia desconhecida");
  const nonce = raw.slice(1, 13);
  const ct = raw.slice(13);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: nonce }, key, ct);
  return new TextDecoder().decode(pt);
}

export const TOKEN_ENCRYPTION_VERSION = VERSION;
