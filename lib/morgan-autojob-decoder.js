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

function extractByteString(content) {
  // Cari: local JzsXfvrF = "\NNN\NNN..."
  const match = content.match(/local\s+JzsXfvrF\s*=\s*"((?:\\\d{1,3})+)"/);
  if (!match) throw new Error("Byte string JzsXfvrF tidak ditemukan");
  return match[1];
}

function extractInitialKey(content) {
  // Cari: local XZqFKBAc = <N>
  const match = content.match(/local\s+XZqFKBAc\s*=\s*(\d+)/);
  if (!match) throw new Error("Key XZqFKBAc tidak ditemukan");
  return parseInt(match[1], 10);
}

function parseByteString(str) {
  const bytes = [];
  const re = /\\(\d{1,3})/g;
  let m;
  while ((m = re.exec(str)) !== null) {
    bytes.push(parseInt(m[1], 10) & 0xff);
  }
  return bytes;
}

function decodeMorganAutoJob(content) {
  const byteStr = extractByteString(content);
  const bytes = parseByteString(byteStr);
  const initialKey = extractInitialKey(content);

  let k = initialKey;
  const out = [];
  for (let i = 1; i <= bytes.length; i++) {
    const b = bytes[i - 1];
    const decoded = bxor(b, k);
    out.push(decoded & 0xff);
    k = (k * 31 + i) % 256;
  }

  return Buffer.from(out).toString("utf8");
}

module.exports = { decodeMorganAutoJob, extractByteString, extractInitialKey };