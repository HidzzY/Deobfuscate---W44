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

function stripPadding(content) {
  return content.replace(/\n{3,}/g, "\n\n");
}

function extractByteString(content) {
  const match = content.match(/local\s+___\s*=\s*'((?:\\\d{1,3})+)'/);
  if (!match) {
    throw new Error("Byte string tidak ditemukan");
  }
  return match[1];
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

function decodeNoFuel(content) {
  const cleaned = stripPadding(content);
  const byteStr = extractByteString(cleaned);
  const bytes = parseByteString(byteStr);

  let key = 84;
  const out = [];
  for (let i = 0; i < bytes.length; i++) {
    const original = bytes[i];
    let b = bxor(bxor(bxor(bxor(original, 84), 17), key % 256), i % 256);
    out.push(b);
    key = original;
  }

  return Buffer.from(out).toString("utf8");
}

module.exports = { decodeNoFuel, stripPadding };
