const STANDARD_B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function bxor(a, b) {
  let r = 0, p = 1;
  while (a > 0 || b > 0) {
    if ((a % 2) !== (b % 2)) r += p;
    a = Math.floor(a / 2);
    b = Math.floor(b / 2);
    p *= 2;
  }
  return r;
}

function extractPayload(content) {
  const patterns = [
    /local\s+_1_I1\s*=\s*'([A-Za-z0-9+/=]{100,})'/,
    /local\s+__I_l\s*=\s*'([A-Za-z0-9+/=]{100,})'/,
    /local\s+_[A-Za-z0-9_]+\s*=\s*'([A-Za-z0-9+/=]{500,})'/,
    /local\s+_[A-Za-z0-9_]+\s*=\s*"([A-Za-z0-9+/=]{500,})"/
  ];
  for (const re of patterns) {
    const m = content.match(re);
    if (m) return m[1];
  }
  throw new Error("Payload base64 tidak ditemukan");
}

function extractKeys(content) {
  // Cari key awal (variabel pendek sebelum loop decode)
  const keyPatterns = [
    /local\s+_I1_lI\s*=\s*(\d+)/,
    /local\s+_l1O00\s*=\s*(\d+)/,
    /local\s+_1ll00\s*=\s*(\d+)/
  ];
  let key1;
  for (const re of keyPatterns) {
    const m = content.match(re);
    if (m) { key1 = parseInt(m[1], 10); break; }
  }
  if (key1 === undefined) throw new Error("Key awal tidak ditemukan");

  // Cari dua XOR key dari pola bxor bertingkat
  const xorPatterns = [
    /_l0OOI_\s*\(\s*_l0OOI_\s*\(\s*_l0OOI_\s*\(\s*_l0OOI_\s*\(\s*_[A-Za-z0-9_]+\s*,\s*(\d+)\s*\)\s*,\s*(\d+)\s*\)/,
    /_O_1_O_\s*\(\s*_O_1_O_\s*\(\s*_O_1_O_\s*\(\s*_O_1_O_\s*\(\s*_[A-Za-z0-9_]+\s*,\s*(\d+)\s*\)\s*,\s*(\d+)\s*\)/,
    /_llO1l_\s*\(\s*_llO1l_\s*\(\s*_llO1l_\s*\(\s*_llO1l_\s*\(\s*_[A-Za-z0-9_]+\s*,\s*(\d+)\s*\)\s*,\s*(\d+)\s*\)/
  ];
  let xorKey1, xorKey2;
  for (const re of xorPatterns) {
    const m = content.match(re);
    if (m) {
      xorKey1 = parseInt(m[1], 10);
      xorKey2 = parseInt(m[2], 10);
      break;
    }
  }
  if (xorKey1 === undefined) throw new Error("Pola XOR tidak ditemukan");

  return { key1, xorKey1, xorKey2 };
}

function base64Decode(str) {
  const clean = str.replace(/[^A-Za-z0-9+/=]/g, "");
  const bytes = [];
  for (let i = 0; i < clean.length; i += 4) {
    const c1 = clean[i];
    const c2 = clean[i + 1];
    const c3 = clean[i + 2];
    const c4 = clean[i + 3];
    const v1 = STANDARD_B64.indexOf(c1);
    const v2 = STANDARD_B64.indexOf(c2);
    const v3 = STANDARD_B64.indexOf(c3);
    const v4 = STANDARD_B64.indexOf(c4);
    const vv1 = v1 < 0 ? 0 : v1;
    const vv2 = v2 < 0 ? 0 : v2;
    const vv3 = v3 < 0 ? 0 : v3;
    const vv4 = v4 < 0 ? 0 : v4;
    const n = (vv1 * 262144) + (vv2 * 4096) + (vv3 * 64) + vv4;
    bytes.push(Math.floor(n / 65536) % 256);
    if (c3 !== "=") bytes.push(Math.floor(n / 256) % 256);
    if (c4 !== "=") bytes.push(n % 256);
  }
  return Buffer.from(bytes);
}

function decodeSpectator(content) {
  const payload = extractPayload(content);
  const keys = extractKeys(content);

  const b64Bytes = base64Decode(payload);
  const out = [];
  let key = keys.key1;
  for (let i = 1; i <= b64Bytes.length; i++) {
    const original = b64Bytes[i - 1];
    const b = bxor(
      bxor(bxor(bxor(original, keys.xorKey1), keys.xorKey2), key % 256),
      (i - 1) % 256
    );
    out.push(b & 0xff);
    key = original;
  }
  return Buffer.from(out).toString("utf8");
}

module.exports = { decodeSpectator, extractPayload, extractKeys };