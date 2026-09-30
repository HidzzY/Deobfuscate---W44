function findPreimage(target) {
  for (let n = 0; n < 256; n++) {
    if ((n * 13 + 7) % 256 === target) return n;
  }
  return null;
}

function extractDataArray(content) {
  const match = content.match(/_DATA\s*=\s*\{([\s\S]*?)\}/);
  if (!match) throw new Error("_DATA array tidak ditemukan");

  const nums = match[1].match(/\d+/g);
  if (!nums) throw new Error("_DATA kosong");

  return nums.map(Number);
}

function decodeMorganKalcer(content) {
  const data = extractDataArray(content);

  const out = [];
  for (const b of data) {
    const decoded = findPreimage(b);
    if (decoded === null) {
      throw new Error("Byte " + b + " tidak bisa di-inverse");
    }
    out.push(decoded);
  }

  return Buffer.from(out).toString("utf8");
}

module.exports = { decodeMorganKalcer, extractDataArray };