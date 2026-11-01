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

// The tool's base case must reproduce the decision page exactly, slider steps or not.
{
  const product = D.products[0];
  const e = { ...product, ...D.defaults, rival: product.rivals[D.defaults.rival] };
  const o = { price: D.price_base, rate: D.defaults.discount_rate, start: D.defaults.first_verified_year, schedule: D.factor.law };
  const { best, pv } = E.recommend(e, o, rules);
  checks++;
  if (best !== D.numbers.best) fails.push(`base best ${best} vs ${D.numbers.best}`);
  for (const k of E.ORDER) same(`base pv ${k}`, pv[k], D.numbers.pv[k]);
  const swing = E.sensitivity(e, o, rules, D.sensitivity_ranges);
  D.numbers.sensitivity.forEach((row, i) => {
    same(`sensitivity ${row.key} low`, swing[i].at_low, row.at_low);
    same(`sensitivity ${row.key} high`, swing[i].at_high, row.at_high);
    checks++;
    if (swing[i].key !== row.key || swing[i].best_high !== row.best_high) fails.push(`sensitivity order ${row.key}`);
  });
  for (const b of D.buyer) {
    const js = E.landed(b.rows, D.years.indexOf(2027), D.price_base, D.factor.law, rules);
    D.numbers.buyer_pin[b.hs6].forEach((row, i) => {
      same(`buyer ${b.hs6} ${row.origin}`, js[i].landed, row.landed);
      checks++;
      if (js[i].origin !== row.origin) fails.push(`buyer order ${b.hs6} ${row.origin}`);
    });
  }
  for (const [i, row] of D.numbers.headline.rows.entries()) {
    same(`hero see ${row.year}`, E.seeDefault(product.default, rules, row.year), row.see);
    same(`hero net ${row.year}`, E.certs(e, i, D.factor.law, rules).stay, row.net);
  }
}

if (fails.length) {
  console.error(fails.slice(0, 10).join("\n"));
  console.error(`FAILED ${fails.length} of ${checks} checks`);
  process.exit(1);
}
console.log(`OK: ${checks} checks across ${D.pins.length} scenarios match the Python model`);
