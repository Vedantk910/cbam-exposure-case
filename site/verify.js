// Pins the browser engine to the Python model. Run: node site/verify.js
const fs = require("fs");
const path = require("path");
const E = require("./engine.js");

const D = JSON.parse(fs.readFileSync(path.join(__dirname, "data.json")));
const rules = { years: D.years, markup: D.markup, cscf: D.cscf };
const TOL = 1e-6;
let checks = 0;
const fails = [];

function same(label, got, want) {
  checks++;
  const bothInf = !Number.isFinite(got) && want === null;
  const relative = Math.abs(got - want) / Math.max(1, Math.abs(want));
  if (!bothInf && !(relative < TOL)) fails.push(`${label}: js ${got} python ${want}`);
}

for (const [n, pin] of D.pins.entries()) {
  const product = D.products.find((p) => p.hs6 === pin.hs6);
  const e = { ...product, ...pin, rival: product.rivals[pin.rival] };
  const o = { price: pin.price, rate: pin.rate, start: D.defaults.first_verified_year, schedule: D.factor[pin.schedule] };
  const { best, pv } = E.recommend(e, o, rules);
  checks++;
  if (best !== pin.expect.best) fails.push(`pin ${n}: best ${best} vs ${pin.expect.best}`);
  for (const k of E.ORDER) same(`pin ${n} pv ${k}`, pv[k], pin.expect.pv[k]);
  same(`pin ${n} flip tonnes`, E.flipTonnesPv(e, "mill", o, rules), pin.expect.flip_tonnes);
  same(`pin ${n} flip premium`, E.flipPremium(e, D.years.indexOf(2034), pin.price, o.schedule, rules), pin.expect.flip_premium_2034);
  same(`pin ${n} flip mill`, E.flipMillIntensity(e, o, rules), pin.expect.flip_mill);
}

if (fails.length) {
  console.error(fails.slice(0, 10).join("\n"));
  console.error(`FAILED ${fails.length} of ${checks} checks`);
  process.exit(1);
}
console.log(`OK: ${checks} checks across ${D.pins.length} scenarios match the Python model`);
