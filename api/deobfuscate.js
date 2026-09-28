const { decodeFlash } = require("../lib/flash-decoder");
const {
  decodeVehkbl,
  extractVehkblKey,
  extractVehkblPayload
} = require("../lib/vehkbl-decoder");
const { extractAndDecode } = require("../lib/allgun-decoder");
const { decodeNoFuel, stripPadding } = require("../lib/nofuel-decoder");
const { decodeFromContent: decodeAimlock } = require("../lib/aimlock-decoder");

function detectObfuscationType(content) {
  // flash: dua XOR key hardcoded 139/78
  if (content.includes("_vdu8aP8cGEvM5 = 139") &&
      content.includes("_vznLf99jPx0Z3 = 78")) {
    return "flash";
  }

  // vehkbl family: alphabet custom + _k + _j
  const isVehkblFamily =
    content.includes('local _m = "!#$%&()*+,-./0123456789:;<>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[]^_`{|}~"') &&
    /local\s+_k\s*=\s*\d+/.test(content) &&
    /local\s+_j\s*=\s*"/.test(content);

  if (isVehkblFamily) {
    // aimlock varian: pakai getfenv + loadstring via string.char byte sequence
    const isAimlock =
      content.includes("type(getfenv)") ||
      content.includes("108,111,97,100,115,116,114,105,110,103");
    return isAimlock ? "aimlock" : "vehkbl";
  }

  // allgun: hex string, subtract 15
  if (content.includes("tonumber(___:sub") && content.includes("- 15")) {
    return "allgun";
  }

  // nofuel: key dinamis, byte string \NNN escapes
  if (/local\s+______1\s*=\s*\d+/.test(content) &&
      /local\s+___\s*=\s*'\\\d{1,3}/.test(content)) {
    return "nofuel";
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

    } else {
      return res.status(400).json({
        error: "Pola obfuscation tidak dikenal",
        detected: type,
        supported: ["flash", "vehkbl", "aimlock", "allgun", "nofuel"]
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