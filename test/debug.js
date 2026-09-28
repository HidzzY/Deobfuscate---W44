const fs = require("fs");
const content = fs.readFileSync("./test/nofuel.lua", "utf8");

console.log("Length:", content.length);
console.log("Has 'local ___':", content.includes("local ___"));
console.log("Has key 84:", content.includes("local ______1 = 84"));

const m1 = content.match(/local\s+___\s*=\s*'((?:\\\d{1,3})+)'/);
console.log("Regex 1 (strict) match:", !!m1);
if (m1) console.log("  Payload length:", m1[1].length);

const m2 = content.match(/local\s+___\s*=\s*'([^']+)'/);
console.log("Regex 2 (loose) match:", !!m2);
if (m2) console.log("  Payload length:", m2[1].length);

const idx = content.indexOf("local ___");
console.log("Snippet around 'local ___':");
console.log(JSON.stringify(content.slice(idx, idx + 120)));
