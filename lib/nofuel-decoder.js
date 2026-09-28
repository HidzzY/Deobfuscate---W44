function bxor(a, b) {
  let r = 0, p = 1;
  while (a > 0 || b > 0) {
    if ((a % 2) !== (b % 2)) r += p;
    a = Math.floor(a / 2); b = Math.floor(b / 2); p *= 2;
  }
  return r;
}

function stripPadding(content) {
  return content.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n");
}

function extractByteString(content) {
  const patterns = [
    /local\s+___\s*=\s*'((?:\\\d{1,3})+)'/,
    /local\s+___\s*=\s*"((?:\\\d{1,3})+)"/,
    /local\s+___\s*=\s*'([^']+)'/,
    /local\s+___\s*=\s*"([^"]+)"/
  ];
  for (const re of patterns) {
    const m = content.match(re);
    if (m) return m[1];
  }
  throw new Error("Byte string tidak ditemukan");
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

function extractKeys(content) {
  const keyMatch = content.match(/local\s+______1\s*=\s*(\d+)/);
  if (!keyMatch) throw new Error("Key awal (______1) tidak ditemukan");
  const key1 = parseInt(keyMatch[1], 10);

  const xorMatch = content.match(
    /________\s*\(\s*________\s*\(\s*________\s*\(\s*________\s*\(\s*__2\s*,\s*(\d+)\s*\)\s*,\s*(\d+)\s*\)/
  );

  let xorKey1, xorKey2;
  if (xorMatch) {
    xorKey1 = parseInt(xorMatch[1], 10);
    xorKey2 = parseInt(xorMatch[2], 10);
  } else {
    const lines = content.split("\n");
    let found = false;
    for (const line of lines) {
      if (line.includes("________") && line.includes("__2")) {
        const nums = line.match(/\d+/g);
        if (nums && nums.length >= 2) {
          xorKey1 = parseInt(nums[0], 10);
          xorKey2 = parseInt(nums[1], 10);
          found = true;
          break;
        }
      }
    }
    if (!found) throw new Error("Pola XOR tidak ditemukan");
  }

  return { key1, xorKey1, xorKey2 };
}

function decodeNoFuel(content) {
  const cleaned = stripPadding(content);
  const byteStr = extractByteString(cleaned);
  const bytes = parseByteString(byteStr);
  if (bytes.length === 0) throw new Error("Byte string kosong setelah parsing");
  const keys = extractKeys(cleaned);
  let key = keys.key1;
  const out = [];
  for (let i = 0; i < bytes.length; i++) {
    const original = bytes[i];
    const b = bxor(
      bxor(bxor(bxor(original, keys.xorKey1), keys.xorKey2), key % 256),
      i % 256
    );
    out.push(b & 0xff);
    key = original;
  }
  return Buffer.from(out).toString("utf8");
}

module.exports = { decodeNoFuel, stripPadding, extractByteString, extractKeys };
