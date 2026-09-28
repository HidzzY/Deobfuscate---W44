const { decodeFlash } = require("./flash-decoder");
const { decodeVehkbl } = require("./vehkbl-decoder");
const { extractAndDecode: decodeAllgun } = require("./allgun-decoder");
const { decodeNoFuel, stripPadding } = require("./nofuel-decoder");
const { decodeFromContent: decodeAimlock } = require("./aimlock-decoder");

// ===== Detector functions =====

function detectFlash(content) {
  return content.includes("_vdu8aP8cGEvM5 = 139") &&
         content.includes("_vznLf99jPx0Z3 = 78");
}

function detectVehkbl(content) {
  // vehkbl ORIGINAL: key hardcoded 123, TANPA blok getfenv/loadstring di akhir
  // (bedain dengan aimlock yang punya getfenv + string.char loadstring)
  if (!content.includes('local _m = "!#$%&()*+,-./0123456789:;<>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[]^_`{|}~"')) {
    return false;
  }
  if (!/local\s+_k\s*=\s*\d+/.test(content)) return false;
  if (!/local\s+_j\s*=\s*"/.test(content)) return false;
  // vehkbl original: loadstring langsung via assert((loadstring or load)(...))()
  // aimlock: pakai getfenv + string.char byte sequence
  if (content.includes("type(getfenv)") || content.includes("108,111,97,100,115,116,114,105,110,103")) {
    return false;
  }
  return true;
}

function detectAimlock(content) {
  // Aimlock: vehkbl family + getfenv + string.char(108,111,97,100,115,116,114,105,110,103) = "loadstring"
  if (!content.includes('local _m = "!#$%&()*+,-./0123456789:;<>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[]^_`{|}~"')) {
    return false;
  }
  if (!/local\s+_k\s*=\s*\d+/.test(content)) return false;
  if (!/local\s+_j\s*=\s*"/.test(content)) return false;
  return content.includes("type(getfenv)") ||
         content.includes("108,111,97,100,115,116,114,105,110,103");
}

function detectAllgun(content) {
  return content.includes("tonumber(___:sub") && content.includes("- 15");
}

function detectNoFuel(content) {
  return /local\s+______1\s*=\s*\d+/.test(content) &&
         /local\s+___\s*=\s*'\\\d{1,3}/.test(content);
}

// ===== Registry =====

const DECODERS = [
  { name: "flash",   detect: detectFlash,   decode: (c) => decodeFlash(extractFlashPayload(c)) },
  { name: "aimlock", detect: detectAimlock, decode: (c) => decodeAimlock(c) },
  { name: "vehkbl",  detect: detectVehkbl,  decode: (c) => decodeVehkblFromContent(c) },
  { name: "allgun",  detect: detectAllgun,  decode: (c) => decodeAllgun(c) },
  { name: "nofuel",  detect: detectNoFuel,  decode: (c) => decodeNoFuel(c) }
];

function extractFlashPayload(content) {
  const match = content.match(/local\s+_IIIbkgx6vAA_UAS\s*=\s*"([^"]+)"/);
  if (!match) throw new Error("Payload flash tidak ditemukan");
  return match[1];
}

// vehkbl original punya key 123, payload di _j
const { decodeVehkbl: decodeVehkblRaw, extractVehkblKey, extractVehkblPayload } = require("./vehkbl-decoder");
function decodeVehkblFromContent(content) {
  const key = extractVehkblKey ? extractVehkblKey(content) : 123;
  const payload = extractVehkblPayload ? extractVehkblPayload(content) : content.match(/local\s+_j\s*=\s*"([^"]+)"/)[1];
  return decodeVehkblRaw(payload, key);
}

function detect(content) {
  for (const d of DECODERS) {
    if (d.detect(content)) return d.name;
  }
  return "unknown";
}

function run(content, type) {
  const decoder = DECODERS.find((d) => d.name === type);
  if (!decoder) throw new Error("Tipe obfuscation tidak dikenal: " + type);
  return decoder.decode(content);
}

function listDecoders() {
  return DECODERS.map((d) => d.name);
}

module.exports = { detect, run, listDecoders, DECODERS };