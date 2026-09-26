// lib/flash-decoder.js

const CUSTOM_ALPHABET = "!#$%&()*+,-./0123456789:;<>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[]^_`{|}~";
const STANDARD_B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const XOR_KEY_1 = 139;
const XOR_KEY_2 = 78;

function buildDecodeMap() {
  const map = {};
  for (let i = 0; i < 64; i++) {
    map[CUSTOM_ALPHABET.charCodeAt(i)] = STANDARD_B64.charCodeAt(i);
  }
  return map;
}

function buildXorTable(key1, key2) {
  const table = new Array(256);
  for (let i = 0; i < 256; i++) {
    let a = i, b = key1, r = 0, p = 1;
    while (a > 0 || b > 0) {
      if ((a % 2) !== (b % 2)) r += p;
      a = Math.floor(a / 2);
      b = Math.floor(b / 2);
      p *= 2;
    }
    a = r; b = key2; r = 0; p = 1;
    while (a > 0 || b > 0) {
      if ((a % 2) !== (b % 2)) r += p;
      a = Math.floor(a / 2);
      b = Math.floor(b / 2);
      p *= 2;
    }
    table[i] = r;
  }
  return table;
}

function decodeFlash(encoded) {
  const decodeMap = buildDecodeMap();
  const xorTable = buildXorTable(XOR_KEY_1, XOR_KEY_2);

  // Langkah 1: substitusi karakter
  let b64 = "";
  for (let i = 0; i < encoded.length; i++) {
    b64 += String.fromCharCode(decodeMap[encoded.charCodeAt(i)]);
  }

  // Langkah 2: decode base64
  const reverseMap = {};
  for (let i = 0; i < 64; i++) {
    reverseMap[STANDARD_B64.charCodeAt(i)] = i;
  }

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

module.exports = { decodeFlash };