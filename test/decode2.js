const fs = require("fs");
const { decodeNoFuel, extractKeys } = require("../lib/nofuel-decoder");

for (const f of ["test/nofuel.lua", "test/deteksi-items.lua"]) {
  try {
    const content = fs.readFileSync(f, "utf8");
    const keys = extractKeys(content);
    const out = decodeNoFuel(content);
    console.log("=== " + f + " ===");
    console.log("Keys:", JSON.stringify(keys));
    console.log("Output length:", out.length);
    console.log("First 200:", out.slice(0, 200).replace(/\n/g, " | "));
    console.log("");
  } catch (e) {
    console.error("ERROR " + f + ":", e.message);
  }
}
