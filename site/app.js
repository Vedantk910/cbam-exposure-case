(async function () {
  const D = await (await fetch("data.json?v=6")).json();
  const N = D.numbers;
  const rules = { years: D.years, markup: D.markup, cscf: D.cscf };
  const $ = (id) => document.getElementById(id);
  const NAMES = { stay: "Stay on defaults", verify: "Verify own plant only", mill: "Verified rod, current mill", green: "Low-carbon rod", divert: "Sell outside the EU" };
  const LINE_NAMES = { stay: "Defaults", verify: "Own plant only", mill: "Verified rod", green: "Low-carbon rod" };
  const SHOWN = ["stay", "verify", "mill", "green", "divert"];
  const color = (k) => `var(--${k})`;
  const SVG = "http://www.w3.org/2000/svg";

  function eur(x) {
    const a = Math.abs(x);
    const s = x < 0 ? "-" : "";
    if (a >= 1e9) return `${s}€${(a / 1e9).toFixed(2)}bn`;
    if (a >= 1e6) return `${s}€${(a / 1e6).toFixed(a >= 1e7 ? 0 : 2)}M`;
    if (a >= 1e4) return `${s}€${Math.round(a / 1e3)}k`;
    return `${s}€${Math.round(a).toLocaleString("en-GB")}`;
  }
  const pct = (x, d = 0) => `${(x * 100).toFixed(d)}%`;
  const whole = (x) => Math.round(x).toLocaleString("en-GB");
  const el = (tag, attrs = {}, text) => {
    const e = document.createElementNS(SVG, tag);
    Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v));
    if (text !== undefined) e.textContent = text;
    return e;
  };

  // Tooltip shared by every chart
  const tip = $("tip");
  function showTip(evt, html) {
    tip.innerHTML = html;
    tip.hidden = false;
    const x = Math.min(evt.clientX + 14, innerWidth - tip.offsetWidth - 8);
    tip.style.left = `${x}px`;
    tip.style.top = `${evt.clientY - tip.offsetHeight - 10}px`;
  }
  const hideTip = () => (tip.hidden = true);

  // Numbers quoted in prose
  const h = N.headline;
  const r27 = h.rows[1];
  const ab = N.ablations;
  const tw = N.origins_bolts.find((o) => o.origin === "TW");
  const est = N.trade.estimates;
  const markets = N.markets;
  const V = {
    payable: pct(h.payable_share_2026),
    multiple: h.benchmark_multiple.toFixed(1),
    ratio: Math.round(h.ratio_2026),
    cost27: eur(r27.cost),
    pct27: pct(r27.pct_value),
    bill26: eur(N.sector.by_year[0].bill),
    naive26: eur(N.sector.by_year[0].naive),
    saveVerify: eur(N.pv.stay - N.pv.verify),
    saveMill: eur(N.saving_stay_to_mill_pv),
    rodShare: pct(N.share_of_prize_from_rod),
    routeTake: pct(1 - ab.green_gap_actual / ab.green_gap_without_route_benchmark),
    premium: eur(D.defaults.green_premium),
    pStar: eur(N.flips.carbon_price_2034),
    millFlip: N.flips.mill_vs_green.toFixed(1),
    sFlip: N.flips.intensity_2028.toFixed(2),
    flipT: Math.round(N.flips.tonnes_mill_pv),
    priceBase: `€${D.price_base.toFixed(2)}`,
    millCost: eur(ab.mill_eur_t),
    twCost: eur(tw.cost),
    sectorPct: pct(N.sector.by_year[0].pct),
    divertLoss: eur(N.divert_price_loss),
    euShare: pct(markets.EU27.kt / N.world_kt_bolts),
    beta: est.base.beta.toFixed(2),
    betaSe: est.base.se.toFixed(2),
    betaOm: est.with_origin_month.beta.toFixed(2),
    betaOmT: est.with_origin_month.t.toFixed(1),
    placeboT: est.placebo_2025.t.toFixed(1),
    tests: D.work.tests,
    stressN: D.work.stress_cases,
    wSources: D.work.sources,
    wRows: whole(D.work.trade_rows),
    wDefaults: whole(D.work.default_rows),
    wBench: whole(D.work.benchmark_rows),
    wChecks: whole(D.pins.length * 9 + 6 + 2 * D.years.length),
  };
  document.querySelectorAll("[data-v]").forEach((n) => (n.textContent = V[n.dataset.v]));

  // Hero: a bolt drawn to scale. Head is free allocation, shank is what needs certificates.
  const X0 = 40;
  const SCALE = 910 / 7.6;
  function drawBolt(row) {
    const s = $("boltSvg");
    [...s.querySelectorAll("g")].forEach((n) => n.remove());
    const g = el("g");
    const head = row.sefa * SCALE;
    const shank = row.net * SCALE;
    const cy = 112;
    const end = X0 + head + shank;

    // total dimension
    const top = 26;
    g.append(el("path", { class: "dim-line", d: `M${X0} ${top - 10}V${cy - 30}M${end} ${top - 10}V${cy - 22}M${X0} ${top}H${end}M${X0 - 6} ${top + 6}l12 -12M${end - 6} ${top + 6}l12 -12` }));
    g.append(el("text", { class: "dim-text", x: X0 + 8, y: top - 8 }, `${row.see.toFixed(2)} t embedded`));

    if (head > 1) {
      g.append(el("path", { class: "bolt-outline", fill: "var(--steel)", d: `M${X0 + 8} ${cy - 48}H${X0 + head}V${cy + 48}H${X0 + 8}L${X0} ${cy + 38}V${cy - 38}Z` }));
      g.append(el("path", { stroke: "var(--ink)", "stroke-width": 1.2, d: `M${X0 + 2} ${cy - 18}H${X0 + head}M${X0 + 2} ${cy + 18}H${X0 + head}` }));
    }
    const x1 = X0 + head;
    g.append(el("path", { class: "bolt-outline", fill: "var(--stay)", d: `M${x1} ${cy - 26}H${end - 8}L${end} ${cy - 18}V${cy + 18}L${end - 8} ${cy + 26}H${x1}Z` }));
    for (let x = x1 + 12; x < end - 10; x += 13) g.append(el("path", { stroke: "var(--bg)", "stroke-width": 1.6, opacity: 0.75, d: `M${x} ${cy - 26}l6 52` }));
    if (shank > 170) g.append(el("text", { class: "dim-text", x: x1 + 12, y: cy + 54 }, `${row.net.toFixed(2)} t needs certificates`));
    if (head > 120) g.append(el("text", { class: "dim-text", x: X0 + 4, y: cy + 82 }, `${row.sefa.toFixed(2)} t free allocation`));

    // the shorthand, same scale
    const y2 = 236;
    const w = Math.max(row.naive * SCALE, 2);
    g.append(el("path", { class: "bolt-outline", fill: "var(--steel)", d: `M${X0} ${y2 - 15}H${X0 + w}V${y2 + 15}H${X0}Z` }));
    const lx = X0 + w + 12;
    if (lx < 640) g.append(el("text", { class: "dim-text", x: lx, y: y2 + 7 }, `${row.naive.toFixed(2)} t on the 2.5% shorthand`));
    else g.append(el("text", { class: "dim-text", x: X0 + 8, y: y2 + 44 }, `${row.naive.toFixed(2)} t on the shorthand`));
    s.append(g);

    const share = row.see ? row.net / row.see : 0;
    $("boltRead").innerHTML = `
      <div><b>${share ? pct(share) : "0%"}</b><span>of embedded emissions is charged</span></div>
      <div><b>${eur(row.cost)}</b><span><i class="swatch" style="background:var(--stay)"></i>a tonne, at €${D.price_base.toFixed(2)} carbon</span></div>
      <div><b>${pct(row.pct_value)}</b><span>of the 2025 EU import price</span></div>
      <div><b>${eur(row.naive_cost)}</b><span>what the shorthand implies</span></div>`;
    s.setAttribute("aria-label", `In ${row.year}, ${row.see.toFixed(2)} tonnes embedded, ${row.net.toFixed(2)} need certificates, the shorthand implies ${row.naive.toFixed(2)}.`);
  }
  const yr = $("yearRange");
  const setYear = () => {
    $("yearOut").textContent = D.years[+yr.value];
    drawBolt(h.rows[+yr.value]);
  };
  yr.addEventListener("input", setYear);
  setYear();

  // One moment of motion on load: the true bill grows out of the shorthand.
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const r = h.rows[0];
    const t0 = performance.now();
    const step = (t) => {
      const k = Math.min((t - t0) / 900, 1);
      const e = 1 - (1 - k) ** 3;
      if (+yr.value === 0) drawBolt({ ...r, net: r.naive + (r.net - r.naive) * e, see: r.see, sefa: r.sefa });
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function hbars(host, rows, { best, fmt = eur } = {}) {
    const vals = rows.map((r) => r.v);
    const lo = Math.min(0, ...vals);
    const hi = Math.max(0, ...vals);
    const span = hi - lo || 1;
    const X = (v) => ((v - lo) / span) * 100;
    host.innerHTML = rows.map((r) => {
      const left = Math.min(X(0), X(r.v));
      const width = Math.max(Math.abs(X(r.v) - X(0)), 0.6);
      const cls = best ? (r.k === best ? "best" : "dim") : "";
      return `<div class="hb ${cls}"><span class="name">${r.name}</span>
        <span class="track"><span class="zero" style="left:${X(0)}%"></span><span class="fill" style="left:${left}%;width:${width}%;background:${r.c}"></span></span>
        <span class="val">${fmt(r.v)}</span></div>`;
    }).join("");
  }

  hbars($("answerBars"), SHOWN.map((k) => ({ k, name: NAMES[k], v: N.pv[k], c: color(k) })), { best: N.best });

  // The tool
  const c = (id) => $(`c_${id}`);
  const logT = (p) => Math.round(20 * (5000 / 20) ** (p / 100));
  const logInv = (t) => (100 * Math.log(t / 20)) / Math.log(5000 / 20);
  D.products.forEach((p, i) => c("product").add(new Option(p.name, i)));
  Object.entries(D.products[0].rivals).forEach(([k, r]) => c("rival").add(new Option(r.name, k)));

  // Sliders snap to steps, so the exact inputs live here. Reset must reproduce the report to the euro.
  const state = {};
  function reset() {
    const d = D.defaults;
    Object.assign(state, {
      product: 0, tonnes: d.tonnes, mill: d.s_mill, price: D.price_base, rival: d.rival, own: d.own, mass: d.mass_ratio,
      low: d.s_low, premium: d.green_premium, verify: d.verify_cost, divert: d.price_loss_divert, rate: d.discount_rate,
    });
    Object.keys(state).forEach((k) => (c(k).value = k === "tonnes" ? logInv(state.tonnes) : state[k]));
    document.querySelector('input[name="sched"][value="law"]').checked = true;
    update();
  }

  function update() {
    const p = D.products[state.product];
    const tonnes = state.tonnes;
    const e = {
      ...p, rival: p.rivals[state.rival], tonnes, own: state.own, mass_ratio: state.mass, s_mill: state.mill, s_low: state.low,
      verify_cost: state.verify, green_premium: state.premium, price_loss_divert: state.divert,
    };
    const sched = document.querySelector('input[name="sched"]:checked').value;
    const o = { price: state.price, rate: state.rate, start: D.defaults.first_verified_year, schedule: D.factor[sched] };

    $("o_tonnes").textContent = whole(tonnes);
    $("o_mill").textContent = e.s_mill.toFixed(1);
    $("o_price").textContent = `€${Number.isInteger(o.price) ? o.price : o.price.toFixed(2)}`;
    $("o_own").textContent = e.own.toFixed(2);
    $("o_mass").textContent = e.mass_ratio.toFixed(2);
    $("o_low").textContent = e.s_low.toFixed(1);
    $("o_premium").textContent = `€${whole(e.green_premium)}`;
    $("o_verify").textContent = `€${whole(e.verify_cost)}`;
    $("o_divert").textContent = `€${whole(e.price_loss_divert)}`;
    $("o_rate").textContent = pct(o.rate);

    const { best, pv } = Engine.recommend(e, o, rules);
    const lines = {
      mill: "Buy verified rod from your current mill.",
      stay: "Stay on default values for now.",
      verify: "Verify your own plant and keep your current rod.",
      green: "Move to low-carbon rod.",
      divert: "Sell outside the EU.",
    };
    const name = e.rival.name;
    const vs = (x) => (x >= 0 ? `${eur(x)} behind ${name}` : `${eur(-x)} ahead of ${name}`);
    const tail = best === "stay"
      ? `At this volume verification costs more than it saves. Staying leaves you ${vs(pv.stay)} over 2027 to 2034.`
      : `That leaves you ${vs(pv[best])} over 2027 to 2034, against ${vs(pv.stay)} on defaults.`;
    $("verdict").innerHTML = `${lines[best]}<small>${tail}</small>`;

    hbars($("toolBars"), SHOWN.map((k) => ({ k, name: NAMES[k], v: pv[k], c: color(k) })), { best });

    const flipT = Engine.flipTonnesPv(e, "mill", o, rules);
    $("f_tonnes").textContent = Number.isFinite(flipT) ? `${whole(flipT)} t a year` : "Never";
    const fm = Engine.flipMillIntensity(e, o, rules);
    $("f_mill").textContent = fm > 0 ? `${fm.toFixed(1)} tCO₂e/t` : "Any level";
    const fp = Engine.flipCarbonPrice(e, D.years.indexOf(2034), o.schedule, rules);
    $("f_price").textContent = Number.isFinite(fp) ? `${eur(fp)}/t` : "Never";

    lineChart(D.years.map((_, i) => Engine.certs(e, i, o.schedule, rules)));
  }

  const POS4 = ["stay", "verify", "mill", "green"];
  $("lineLegend").innerHTML = POS4.map((k) => `<span><i style="background:${color(k)}"></i>${LINE_NAMES[k]}</span>`).join("");

  function lineChart(series) {
    const W = 720, H = 260, L = 34, R = 104, T = 10, B = 26;
    const host = $("lineChart");
    const top = Math.ceil(Math.max(...series.flatMap((s) => POS4.map((k) => s[k])))) || 1;
    const X = (i) => L + (i / (series.length - 1)) * (W - L - R);
    const Y = (v) => T + (1 - v / top) * (H - T - B);
    const s = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "Certificates per tonne by position and year" });
    const step = top > 5 ? 2 : 1;
    for (let v = 0; v <= top; v += step) {
      s.append(el("line", { x1: L, x2: W - R, y1: Y(v), y2: Y(v), stroke: "var(--rule)", "stroke-width": 1 }));
      s.append(el("text", { x: L - 8, y: Y(v) + 4, "text-anchor": "end" }, v));
    }
    D.years.forEach((y, i) => { if (i % 2 === 0) s.append(el("text", { x: X(i), y: H - 6, "text-anchor": "middle" }, y)); });

    const ends = POS4.map((k) => ({ k, y: Y(series[series.length - 1][k]) })).sort((a, b) => a.y - b.y);
    for (let i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < 15) ends[i].y = ends[i - 1].y + 15;
    POS4.forEach((k) => {
      s.append(el("path", { fill: "none", stroke: color(k), "stroke-width": 2.2, "stroke-linejoin": "round", d: series.map((r, i) => `${i ? "L" : "M"}${X(i)} ${Y(r[k])}`).join("") }));
      const pos = ends.find((n) => n.k === k);
      s.append(el("text", { x: W - R + 8, y: pos.y + 4 }, LINE_NAMES[k]));
    });

    const cross = el("line", { y1: T, y2: H - B, stroke: "var(--ink-3)", "stroke-width": 1, visibility: "hidden" });
    s.append(cross);
    const hit = el("rect", { x: L, y: T, width: W - L - R, height: H - T - B, fill: "transparent" });
    hit.addEventListener("pointermove", (evt) => {
      const box = s.getBoundingClientRect();
      const px = ((evt.clientX - box.left) / box.width) * W;
      const i = Math.max(0, Math.min(series.length - 1, Math.round(((px - L) / (W - L - R)) * (series.length - 1))));
      cross.setAttribute("x1", X(i));
      cross.setAttribute("x2", X(i));
      cross.setAttribute("visibility", "visible");
      showTip(evt, `<b>${D.years[i]}</b><br>${POS4.map((k) => `${LINE_NAMES[k]}: ${series[i][k].toFixed(2)}`).join("<br>")}`);
    });
    hit.addEventListener("pointerleave", () => { cross.setAttribute("visibility", "hidden"); hideTip(); });
    s.append(hit);
    host.replaceChildren(s);
  }

  document.querySelectorAll("#controls input, #controls select").forEach((n) => n.addEventListener("input", () => {
    const key = n.id.replace("c_", "");
    if (n.type !== "radio") state[key] = key === "tonnes" ? logT(+n.value) : key === "rival" ? n.value : +n.value;
    update();
  }));
  $("reset").addEventListener("click", reset);
  reset();

  // Heat table
  const shownYears = [2026, 2028, 2030, 2032, 2034];
  const lines = [...N.sector.top_lines].sort((a, b) => b.pct[2026] - a.pct[2026]);
  const peak = Math.max(...lines.map((l) => l.pct[2034]));
  $("heat").innerHTML = `<thead><tr><th scope="col">Product</th><th scope="col">2025 trade</th>${shownYears.map((y) => `<th scope="col">${y}</th>`).join("")}</tr></thead><tbody>` +
    lines.map((l) => `<tr title="${l.label.replace(/"/g, "&quot;")}"><td>${l.name}</td><td>${eur(l.value)}</td>${shownYears.map((y) => {
      const share = Math.round((l.pct[y] / peak) * 88) + 4;
      const ink = share > 50 ? "#fff" : "var(--ink)";
      return `<td class="c" style="background:color-mix(in oklab, var(--stay) ${share}%, var(--bg));color:${ink}">${pct(l.pct[y])}</td>`;
    }).join("")}</tr>`).join("") + "</tbody>";

  // Origin bars
  hbars($("originBars"), N.origins_bolts.filter((o) => o.tonnes >= 2000 || o.origin === "IN").map((o) => ({
    k: o.origin, name: `${o.name} (${o.default.toFixed(2)})`, v: o.cost, c: o.origin === "IN" ? "var(--stay)" : "var(--steel)",
  })));

  // Sector chart
  (function () {
    const W = 720, H = 280, L = 44, R = 8, T = 16, B = 26;
    const rows = N.sector.by_year;
    const top = Math.ceil(Math.max(...rows.map((r) => r.bill)) / 5e8) * 5e8;
    const X = (i) => L + (i + 0.5) * ((W - L - R) / rows.length);
    const Y = (v) => T + (1 - v / top) * (H - T - B);
    const s = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "India's CBAM bill by year against the shorthand" });
    for (let v = 0; v <= top; v += 5e8) {
      s.append(el("line", { x1: L, x2: W - R, y1: Y(v), y2: Y(v), stroke: "var(--rule)" }));
      s.append(el("text", { x: L - 8, y: Y(v) + 4, "text-anchor": "end" }, v / 1e6));
    }
    const w = 22;
    rows.forEach((r, i) => {
      const a = el("rect", { x: X(i) - w - 1, y: Y(r.bill), width: w, height: Y(0) - Y(r.bill), rx: 4, fill: "var(--stay)" });
      const b = el("rect", { x: X(i) + 1, y: Y(r.naive), width: w, height: Math.max(Y(0) - Y(r.naive), 1), rx: 4, fill: "var(--steel)" });
      [a, b].forEach((n) => {
        n.addEventListener("pointermove", (evt) => showTip(evt, `<b>${r.year}</b><br>Rule: ${eur(r.bill)}<br>Shorthand: ${eur(r.naive)}<br>${pct(r.pct)} of 2025 value`));
        n.addEventListener("pointerleave", hideTip);
        s.append(n);
      });
      s.append(el("text", { x: X(i), y: H - 6, "text-anchor": "middle" }, r.year));
    });
    $("sectorChart").append(s);
    $("sectorLegend").innerHTML = `<span><i style="background:var(--stay);height:10px;vertical-align:0"></i>The rule</span><span><i style="background:var(--steel);height:10px;vertical-align:0"></i>The 2.5% shorthand</span>`;
  })();

  // Markets table
  const ORDER = ["EU27", "US", "Rest of world", "UK"];
  const TERMS = { EU27: "CBAM from 2026", US: "Section 232, reported 25 to 50%", "Rest of world": "No carbon border charge found", UK: "Own CBAM from January 2027" };
  $("markets").innerHTML = `<thead><tr><th>Destination</th><th class="n">Thousand tonnes</th><th class="n">USD per kg</th><th>Barrier</th></tr></thead><tbody>` +
    ORDER.map((k) => `<tr><td>${k === "EU27" ? "EU" : k}</td><td class="n">${markets[k].kt.toFixed(1)}</td><td class="n">${markets[k].usd_kg.toFixed(2)}</td><td>${TERMS[k]}</td></tr>`).join("") + "</tbody>";

  // Event study
  (function () {
    const W = 720, H = 260, L = 40, R = 12, T = 12, B = 26;
    const pts = [{ period: "2023H1", beta: 0, se: 0 }, ...N.trade.event_study];
    const hi = Math.ceil(Math.max(...pts.map((p) => p.beta + 1.96 * p.se)));
    const lo = Math.floor(Math.min(...pts.map((p) => p.beta - 1.96 * p.se)));
    const X = (i) => L + (i + 0.5) * ((W - L - R) / pts.length);
    const Y = (v) => T + ((hi - v) / (hi - lo)) * (H - T - B);
    const s = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "Event study of EU imports by burden" });
    const first = pts.findIndex((p) => p.period === "2026H1");
    s.append(el("rect", { x: X(first) - (W - L - R) / pts.length / 2, y: T, width: W - R - (X(first) - (W - L - R) / pts.length / 2), height: H - T - B, fill: "var(--mill)", opacity: 0.1 }));
    s.append(el("text", { x: W - R - 6, y: T + 16, "text-anchor": "end" }, "CBAM in force"));
    for (let v = lo; v <= hi; v++) {
      s.append(el("line", { x1: L, x2: W - R, y1: Y(v), y2: Y(v), stroke: v === 0 ? "var(--ink-3)" : "var(--rule)" }));
      s.append(el("text", { x: L - 8, y: Y(v) + 4, "text-anchor": "end" }, v));
    }
    pts.forEach((p, i) => {
      s.append(el("line", { x1: X(i), x2: X(i), y1: Y(p.beta + 1.96 * p.se), y2: Y(p.beta - 1.96 * p.se), stroke: "var(--mill)", "stroke-width": 2 }));
      const dot = el("circle", { cx: X(i), cy: Y(p.beta), r: 5, fill: "var(--mill)", stroke: "var(--bg)", "stroke-width": 2 });
      dot.addEventListener("pointermove", (evt) => showTip(evt, `<b>${p.period}</b><br>${p.beta.toFixed(2)} (se ${p.se.toFixed(2)})`));
      dot.addEventListener("pointerleave", hideTip);
      s.append(dot);
      s.append(el("text", { x: X(i), y: H - 6, "text-anchor": "middle" }, p.period.replace("20", "").replace("H", " H")));
    });
    $("eventChart").append(s);
  })();

  // Attacks, stress, assumptions, sources
  const st = (name) => N.stress.find((r) => r.case === name);
  const attacks = [
    ["The Commission says CBAM applies only to the share without free allowances. Isn't 2.5% right?",
      `Right at the benchmark, wrong above it. Q&A 3.7 subtracts a benchmark-based amount from embedded emissions. India's default for bolts is ${V.multiple} times that benchmark.`],
    ["No Indian mill has published 2.6 tCO₂e/t. Your answer rests on a guess.",
      `It is the weakest input. At 3.5 verified rod still wins. Above ${V.millFlip} low-carbon rod takes over. At this volume defaults never come back, so the ranking holds even though the size of the prize moves.`],
    ["The verification cost is one press figure.",
      `Treble it and the trigger moves from ${whole(st("Base case").flip_tonnes)} to ${whole(st("Verification costs three times more").flip_tonnes)} tonnes a year.`],
    ["The importer pays CBAM, so why should an exporter care?",
      "A buyer will not pay more than the next supplier's landed cost. The gap to that rival comes out of the exporter's price, whoever signs the declaration."],
    ["Rivals will verify too.",
      `Then the EU price rises by less and everyone's hit grows. The ranking does not change, because the rival term cancels between positions that stay in the EU.`],
    ["The EU may slow the phase-out.",
      `COM(2026) 616 moves the verified-rod hit from ${eur(st("Base case").mill)} to ${eur(st("COM(2026) 616 slower phase-out").mill)}. The gap between defaults and verified data barely depends on the schedule.`],
    ["Trade has not fallen, so is this a real problem?",
      "Not proven yet. No certificate has been sold, and the data ends in August 2026. The case rests on the rule's arithmetic, not on a trade effect."],
  ];
  $("attacks").innerHTML = `<thead><tr><th>Attack</th><th>Answer</th></tr></thead><tbody>${attacks.map((a) => `<tr><td>${a[0]}</td><td>${a[1]}</td></tr>`).join("")}</tbody>`;

  $("stress").innerHTML = `<thead><tr><th>Case</th><th>Best position</th><th class="n">Defaults</th><th class="n">Verified rod</th><th class="n">Trigger, t/yr</th></tr></thead><tbody>${
    N.stress.map((r) => `<tr><td>${r.case}</td><td>${NAMES[r.answer]}</td><td class="n">${eur(r.stay)}</td><td class="n">${eur(r.mill)}</td><td class="n">${whole(r.flip_tonnes)}</td></tr>`).join("")}</tbody>`;

  $("assumptions").innerHTML = `<thead><tr><th>Assumption</th><th class="n">Value</th><th>Why this value</th></tr></thead><tbody>${
    D.assumptions.map((a) => `<tr><td>${a.name}</td><td class="n">${a.value} ${a.unit}</td><td>${a.why}</td></tr>`).join("")}</tbody>`;

  const ABLATE = [
    ["Defaults in 2027, as the rule stands", ab.stay_eur_t],
    ["Take away free allocation", ab.without_free_allocation],
    ["Take away the mark-up", ab.without_mark_up],
    ["Give India Taiwan's default", ab.if_india_had_taiwan_default],
    ["Verified rod instead", ab.mill_eur_t],
  ];
  $("ablate").innerHTML = `<thead><tr><th>Ablation, bolts in 2027</th><th class="n">EUR per tonne</th></tr></thead><tbody>${
    ABLATE.map((a) => `<tr><td>${a[0]}</td><td class="n">${eur(a[1])}</td></tr>`).join("")
  }<tr><td>Low-carbon rod's edge over verified rod, if the benchmark ignored route</td><td class="n">${eur(ab.green_gap_without_route_benchmark)}</td></tr><tr><td>Low-carbon rod's edge as the rule stands</td><td class="n">${eur(ab.green_gap_actual)}</td></tr></tbody>`;

  const TAG = { PRIMARY: "Primary", OFFICIAL_DATA: "Official data", SECONDARY: "Secondary" };
  $("sourceList").innerHTML = `<tbody>${D.sources.map((s) => `<tr><td>${TAG[s.tag]}</td><td><a href="${s.url}">${s.title}</a></td></tr>`).join("")}</tbody>`;
})();
