const fs = require("fs");
const { decodeNoFuel } = require("../lib/nofuel-decoder");
const content = fs.readFileSync("./test/nofuel.lua", "utf8");

try {
  const out = decodeNoFuel(content);
  console.log("Output length:", out.length);
  console.log("First 500 chars:");
  console.log(out.slice(0, 500));
  console.log("---");
  console.log("Looks like Lua?", /function|local|return|end|samp/i.test(out));
} catch (e) {
  console.error("Decode error:", e.message);
}
