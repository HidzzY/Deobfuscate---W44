const CUSTOM_ALPHABET = "!#$%&()*+,-./0123456789:;<>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[]^_`{|}~";
const STANDARD_B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function buildDecodeMap() {
  const map = {};
  for (let i = 0; i < 64; i++) {
    map[CUSTOM_ALPHABET.charCodeAt(i)] = STANDARD_B64.charCodeAt(i);
  }
  return map;
}

function buildXorTable(key) {
  const table = new Array(256);
  for (let i = 0; i < 256; i++) {
    let a = i, b = key, r = 0, p = 1;
    while (a > 0 || b > 0) {
      if ((a % 2) !== (b % 2)) r += p;
      a = Math.floor(a / 2); b = Math.floor(b / 2); p *= 2;
    }
    table[i] = r;
  }
  return table;
}

function extractKey(content) {
  const match = content.match(/local\s+_k\s*=\s*(\d+)/);
  if (!match) throw new Error("Key _k tidak ditemukan");
  return parseInt(match[1], 10);
}

function extractPayload(content) {
  const match = content.match(/local\s+_j\s*=\s*"([^"]+)"/);
  if (!match) throw new Error("Payload _j tidak ditemukan");
  return match[1];
}

function decode(payload, key) {
  const decodeMap = buildDecodeMap();
  const xorTable = buildXorTable(key);
  let b64 = "";
  for (let i = 0; i < payload.length; i++) {
    b64 += String.fromCharCode(decodeMap[payload.charCodeAt(i)]);
  }
  const reverseMap = {};
  for (let i = 0; i < 64; i++) reverseMap[STANDARD_B64.charCodeAt(i)] = i;
  const bytes = [];
  for (let i = 0; i < b64.length; i += 4) {
    const v1 = reverseMap[b64.charCodeAt(i)];
    const v2 = reverseMap[b64.charCodeAt(i + 1)];
    const v3 = reverseMap[b64.charCodeAt(i + 2)];
    const v4 = reverseMap[b64.charCodeAt(i + 3)];
    bytes.push(xorTable[(v1 * 4) + Math.floor(v2 / 16)]);
    bytes.push(xorTable[((v2 % 16) * 16) + Math.floor(v3 / 4)]);
    bytes.push(xorTable[((v3 % 4) * 64) + v4]);
  }
  return Buffer.from(bytes).toString("utf8");
}

function decodeFromContent(content) {
  const key = extractKey(content);
  const payload = extractPayload(content);
  return decode(payload, key);
}

module.exports = { decode, decodeFromContent, extractKey, extractPayload };
