const { decodeFlash } = require("../lib/flash-decoder");
const {
  decodeVehkbl,
  extractVehkblKey,
  extractVehkblPayload
} = require("../lib/vehkbl-decoder");
const { extractAndDecode } = require("../lib/allgun-decoder");
const { decodeNoFuel, stripPadding } = require("../lib/nofuel-decoder");
const { decodeFromContent: decodeAimlock } = require("../lib/aimlock-decoder");
const { decodeFromContent: decodeEspline } = require("../lib/espline-decoder");
const { decodeMorganAutoJob } = require("../lib/morgan-autojob-decoder");
const { decodeSpectator } = require("../lib/spectator-decoder");
const { decodeMorganKalcer } = require("../lib/morgan-kalcer-decoder");

function detectObfuscationType(content) {
  if (content.includes("_vdu8aP8cGEvM5 = 139") &&
      content.includes("_vznLf99jPx0Z3 = 78")) {
    return "flash";
  }

  const isVehkblFamily =
    content.includes('local _m = "!#$%&()*+,-./0123456789:;<>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[]^_`{|}~"') &&
    /local\s+_k\s*=\s*\d+/.test(content) &&
    /local\s+_j\s*=\s*"/.test(content);

  if (isVehkblFamily) {
    const isAimlock =
      content.includes("type(getfenv)") ||
      content.includes("108,111,97,100,115,116,114,105,110,103");
    return isAimlock ? "aimlock" : "vehkbl";
  }

  if (content.includes("tonumber(___:sub") && content.includes("- 15")) {
    return "allgun";
  }

  if (/local\s+______1\s*=\s*\d+/.test(content) &&
      /local\s+___\s*=\s*'\\\d{1,3}/.test(content)) {
    return "nofuel";
  }

  if (/local\s+_00_1\s*=\s*'[A-Za-z0-9+/=]+'/.test(content) &&
      content.includes("_d64") &&
      content.includes("_llO1l_") &&
      /local\s+_1ll00\s*=\s*\d+/.test(content)) {
    return "espline";
  }

  const hasByteString = /local\s+[A-Za-z0-9_]+\s*=\s*"((?:\\\d{1,3}){500,})"/.test(content);
  const hasChecksum = content.includes("% 65535") && content.includes("~=");
  const hasRollingXor = content.includes("* 31 + i") && content.includes("% 256");

  if (hasByteString && hasChecksum && hasRollingXor) {
    return "morgan_autojob";
  }

  // morgan_kalcer: _MORGAN_VM + _DATA + affine cipher * 13 + 7
  if (content.includes("_MORGAN_VM") &&
      content.includes("_DATA") &&
      content.includes("* 13 + 7")) {
    return "morgan_kalcer";
  }

  const hasBigB64 = /local\s+_[A-Za-z0-9_]+\s*=\s*'[A-Za-z0-9+/=]{1000,}'/.test(content);
  const hasD64 = content.includes("_d64");
  const hasXor = content.includes("_O_1_O_") || content.includes("_l0OOI_");

  if (hasBigB64 && hasD64 && hasXor && !content.includes("_00_1")) {
    return "spectator_family";
  }

  return "unknown";
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method tidak diizinkan" });
  }

  const { content } = req.body;

  if (!content || typeof content !== "string") {
    return res.status(400).json({ error: "Isi file kosong" });
  }

  try {
    const cleaned = stripPadding(content);
    const type = detectObfuscationType(cleaned);
    let result;

    if (type === "flash") {
      const match = cleaned.match(/local\s+_IIIbkgx6vAA_UAS\s*=\s*"([^"]+)"/);
      if (!match) throw new Error("Payload flash tidak ditemukan");
      result = decodeFlash(match[1]);

    } else if (type === "vehkbl") {
      const key = extractVehkblKey(cleaned);
      const payload = extractVehkblPayload(cleaned);
      result = decodeVehkbl(payload, key);

    } else if (type === "aimlock") {
      result = decodeAimlock(cleaned);

    } else if (type === "allgun") {
      result = extractAndDecode(cleaned);

    } else if (type === "nofuel") {
      result = decodeNoFuel(cleaned);

    } else if (type === "espline") {
      result = decodeEspline(cleaned);

    } else if (type === "morgan_autojob") {
      result = decodeMorganAutoJob(cleaned);

    } else if (type === "morgan_kalcer") {
      result = decodeMorganKalcer(cleaned);

    } else if (type === "spectator_family") {
      result = decodeSpectator(cleaned);

    } else {
      return res.status(400).json({
        error: "Pola obfuscation tidak dikenal",
        detected: type,
        supported: [
          "flash",
          "vehkbl",
          "aimlock",
          "allgun",
          "nofuel",
          "espline",
          "morgan_autojob",
          "morgan_kalcer",
          "spectator_family"
        ]
      });
    }

    return res.status(200).json({
      success: true,
      type: type,
      originalSize: content.length,
      cleanedSize: cleaned.length,
      decodedSize: result.length,
      decoded: result
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
};