// The Python model's formulas, unchanged, so the browser can recompute live.
// site/verify.js fails if any result drifts from model/decision.py.
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Engine = factory();
})(typeof self !== "undefined" ? self : this, function () {
  const ORDER = ["stay", "verify", "mill", "green", "divert"];

  const markUp = (rules, year) => rules.markup[Math.min(year, 2028)];
  const seeDefault = (d, rules, year) => d * (1 + markUp(rules, year));
  const floor = (see, sefa) => Math.max(0, see - sefa);

  function certs(e, i, schedule, rules) {
    const year = rules.years[i];
    const f = schedule[i] * rules.cscf;
    const m = e.mass_ratio;
    const act = f * (e.bm_a + m * e.bm_precursor);
    const actLow = f * (e.bm_a + m * e.bm_precursor_low);
    return {
      stay: floor(seeDefault(e.default, rules, year), f * e.bm_b),
      verify: floor(e.own + m * seeDefault(e.default_precursor, rules, year), act),
      mill: floor(e.own + m * e.s_mill, act),
      green: floor(e.own + m * e.s_low, actLow),
    };
  }

  function rivalNet(rival, i, schedule, rules) {
    const f = schedule[i] * rules.cscf;
    return floor(seeDefault(rival.d, rules, rules.years[i]), f * rival.bm[i]);
  }

  function annualHit(e, i, price, schedule, rules) {
    const c = certs(e, i, schedule, rules);
    const r = rivalNet(e.rival, i, schedule, rules);
    const t = e.tonnes;
    const absorbed = (k) => (c[k] - r) * price * t;
    return {
      stay: absorbed("stay"),
      verify: absorbed("verify") + e.verify_cost,
      mill: absorbed("mill") + e.verify_cost,
      green: absorbed("green") + e.verify_cost + e.green_premium * e.mass_ratio * t,
      divert: e.price_loss_divert * t,
    };
  }

  function presentHit(e, o, rules) {
    const total = Object.fromEntries(ORDER.map((k) => [k, 0]));
    rules.years.forEach((year, i) => {
      if (year < o.start) return;
      const hit = annualHit(e, i, o.price, o.schedule, rules);
      const d = (1 + o.rate) ** (year - o.start);
      ORDER.forEach((k) => (total[k] += hit[k] / d));
    });
    return total;
  }

  function recommend(e, o, rules) {
    const pv = presentHit(e, o, rules);
    const best = ORDER.reduce((a, k) => (pv[k] < pv[a] ? k : a), ORDER[0]);
    return { best, pv };
  }

  function flipTonnesPv(e, option, o, rules) {
    let cost = 0;
    let saving = 0;
    rules.years.forEach((year, i) => {
      if (year < o.start) return;
      const d = (1 + o.rate) ** (year - o.start);
      const c = certs(e, i, o.schedule, rules);
      cost += e.verify_cost / d;
      saving += ((c.stay - c[option]) * o.price) / d;
    });
    return saving > 0 ? cost / saving : Infinity;
  }

  function flipPremium(e, i, price, schedule, rules) {
    const c = certs(e, i, schedule, rules);
    return ((c.mill - c.green) * price) / e.mass_ratio;
  }

  function flipCarbonPrice(e, i, schedule, rules) {
    const c = certs(e, i, schedule, rules);
    const gap = c.mill - c.green;
    return gap > 0 ? (e.green_premium * e.mass_ratio) / gap : Infinity;
  }

  function flipMillIntensity(e, o, rules) {
    const pv = presentHit(e, o, rules);
    const weight = rules.years.reduce((w, y) => (y >= o.start ? w + 1 / (1 + o.rate) ** (y - o.start) : w), 0);
    return e.s_mill + (pv.green - pv.mill) / (weight * e.mass_ratio * o.price * e.tonnes);
  }

  return { ORDER, markUp, seeDefault, certs, rivalNet, annualHit, presentHit, recommend, flipTonnesPv, flipPremium, flipCarbonPrice, flipMillIntensity };
});
