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
  const patterns = [
    /local\s+JzsXfvrF\s*=\s*"((?:\\\d{1,3}){500,})"/,
    /local\s+nKixvQOk\s*=\s*"((?:\\\d{1,3}){500,})"/,
    /local\s+[A-Za-z0-9_]+\s*=\s*"((?:\\\d{1,3}){500,})"/
  ];
  for (const re of patterns) {
    const m = content.match(re);
    if (m) return m[1];
  }
  throw new Error("Byte string tidak ditemukan");
}

function extractInitialKey(content) {
  const patterns = [
    /local\s+XZqFKBAc\s*=\s*(\d+)/,
    /local\s+vBSTRGOZ\s*=\s*(\d+)/,
    /local\s+[A-Za-z0-9_]+\s*=\s*(\d+)\s*\n\s*local\s+[A-Za-z0-9_]+\s*=\s*0\s*\n\s*for\s+i\s*=\s*1/
  ];
  for (const re of patterns) {
    const m = content.match(re);
    if (m) return parseInt(m[1], 10);
  }
  throw new Error("Key awal tidak ditemukan");
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
