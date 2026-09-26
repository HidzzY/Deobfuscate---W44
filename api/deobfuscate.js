const { decodeFlash } = require("../lib/flash-decoder");
const { decodeVehkbl } = require("../lib/vehkbl-decoder");
const { extractAndDecode } = require("../lib/allgun-decoder");
const { decodeNoFuel, stripPadding } = require("../lib/nofuel-decoder");

function detectObfuscationType(content) {
  if (content.includes("_vdu8aP8cGEvM5 = 139") &&
      content.includes("_vznLf99jPx0Z3 = 78")) {
    return "flash";
  }
  if (content.includes("local _k = 123")) {
    return "vehkbl";
  }
  if (content.includes("tonumber(___:sub") && content.includes("- 15")) {
    return "allgun";
  }
  // NoFuel signature: variabel ___ dengan byte string \NNN dan key 84
  if (content.includes("local ______1 = 84") &&
      content.match(/local\s+___\s*=\s*'((?:\\\d{1,3})+)'/)) {
    return "nofuel";
  }
  return "unknown";
}

function extractPayload(content, type) {
  if (type === "flash") {
    const match = content.match(/local\s+_IIIbkgx6vAA_UAS\s*=\s*"([^"]+)"/);
    if (!match) throw new Error("Payload flash tidak ditemukan");
    return match[1];
  }
  if (type === "vehkbl") {
    const match = content.match(/local\s+_j\s*=\s*"([^"]+)"/);
    if (!match) throw new Error("Payload vehkbl tidak ditemukan");
    return match[1];
  }
  if (type === "allgun") {
    return content;
  }
  if (type === "nofuel") {
    return content;
  }
  throw new Error("Tipe obfuscation tidak dikenal");
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
      const payload = extractPayload(cleaned, "flash");
      result = decodeFlash(payload);
    } else if (type === "vehkbl") {
      const payload = extractPayload(cleaned, "vehkbl");
      result = decodeVehkbl(payload);
    } else if (type === "allgun") {
      result = extractAndDecode(cleaned);
    } else if (type === "nofuel") {
      result = decodeNoFuel(cleaned);
    } else {
      return res.status(400).json({
        error: "Pola obfuscation tidak dikenal",
        detected: type
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