function decodeAllgun(hexString) {
  let decoded = "";
  for (let i = 0; i < hexString.length; i += 2) {
    let byte = parseInt(hexString.substring(i, i + 2), 16) - 15;
    if (byte < 0) byte += 256;
    decoded += String.fromCharCode(byte);
  }
  return decoded;
}

function extractAndDecode(fileContent) {
  const hexMatch = fileContent.match(/local\s+___\s*=\s*"([^"]+)"/);
  if (!hexMatch) throw new Error("Payload hex tidak ditemukan");
  return decodeAllgun(hexMatch[1]);
}

module.exports = { decodeAllgun, extractAndDecode };
