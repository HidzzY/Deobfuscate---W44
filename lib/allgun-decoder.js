// lib/allgun-decoder.js

function decodeAllgun(hexString) {
  let decoded = "";
  for (let i = 0; i < hexString.length; i += 2) {
    let byte = parseInt(hexString.substring(i, i + 2), 16) - 15;
    if (byte < 0) byte += 256;
    decoded += String.fromCharCode(byte);
  }
  return decoded;
}

// Ekstrak string hex dari isi file
function extractAndDecode(fileContent) {
  // Pola: local ___ = "..." lalu loop dengan tonumber(___:sub(...), 16) - 15
  const hexMatch = fileContent.match(/local\s+___\s*=\s*"([^"]+)"/);
  if (!hexMatch) {
    throw new Error("Payload hex tidak ditemukan");
  }

  const hexPayload = hexMatch[1];
  const decoded = decodeAllgun(hexPayload);

  // Hasil decode adalah script obfuscated asli
  // yang berisi loader lain. Return payload intermediate.
  return decoded;
}

module.exports = { decodeAllgun, extractAndDecode };