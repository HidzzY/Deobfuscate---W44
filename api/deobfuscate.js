// api/deobfuscate.js

const { decodeFlash } = require("../lib/flash-decoder");
const { decodeVehkbl } = require("../lib/vehkbl-decoder");
const { extractAndDecode } = require("../lib/allgun-decoder");

function detectObfuscationType(content) {
  // Signature flash.lua: alphabet custom + dua XOR key
  if (content.includes("_vdu8aP8cGEvM5 = 139") && 
      content.includes("_vznLf99jPx0Z3 = 78")) {
    return "flash";
  }

  // Signature vehkbl.lua: XOR key 123
  if (content.includes("local _k = 123")) {
    return "vehkbl";
  }

  // Signature allgun: pola local ___ = "hex..." dengan - 15
  if (content.includes("tonumber(___:sub") && content.includes("- 15")) {
    return "allgun";
  }

  return "unknown";
}

function extractPayload(content, type) {
  if (type === "flash") {
    // Ekstrak string encoded dari _IIIbkgx6vAA_UAS
    const match = content.match(/local\s+_IIIbkgx6vAA_UAS\s*=\s*"([^"]+)"/);
    if (!match) throw new Error("Payload flash tidak ditemukan");
    return match[1];
  }

  if (type === "vehkbl") {
    // Ekstrak dari variabel _j
    const match = content.match(/local\s+_j\s*=\s*"([^"]+)"/);
    if (!match) throw new Error("Payload vehkbl tidak ditemukan");
    return match[1];
  }

  if (type === "allgun") {
    return content; // ditangani terpisah
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
    const type = detectObfuscationType(content);
    let result;

    if (type === "flash") {
      const payload = extractPayload(content, "flash");
      result = decodeFlash(payload);
    } else if (type === "vehkbl") {
      const payload = extractPayload(content, "vehkbl");
      result = decodeVehkbl(payload);
    } else if (type === "allgun") {
      result = extractAndDecode(content);
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