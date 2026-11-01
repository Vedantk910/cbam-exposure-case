(async function () {
  const $ = (id) => document.getElementById(id);
  const has = (id) => document.getElementById(id) !== null;
  const page = document.body.dataset.page;
  const SVG = "http://www.w3.org/2000/svg";

  // Theme: follow the system unless the visitor chooses.
  const root = document.documentElement;
  const store = { get() { try { return localStorage.getItem("theme"); } catch { return null; } }, set(v) { try { localStorage.setItem("theme", v); } catch { /* private window */ } } };
  const paintTheme = (t) => { root.dataset.theme = t; $("theme").textContent = t === "dark" ? "Light" : "Dark"; $("theme").setAttribute("aria-label", `Switch to ${t === "dark" ? "light" : "dark"} theme`); };
  paintTheme(store.get() || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));
  const onTheme = [];
  $("theme").addEventListener("click", () => {
    const t = root.dataset.theme === "dark" ? "light" : "dark";
    store.set(t);
    paintTheme(t);
    onTheme.forEach((f) => f());
  });

  let D;
  try {
    const r = await fetch("data.json?v=8");
    if (!r.ok) throw new Error(r.status);
    D = await r.json();
  } catch {
    $("status").innerHTML = 'The figures did not load. Reload the page, or read the <a href="https://github.com/Vedantk910/cbam-exposure-case/blob/main/report/decision_page.md">decision page on GitHub</a>.';
    return;
  }
  $("status").hidden = true;

  const N = D.numbers;
  const rules = { years: D.years, markup: D.markup, cscf: D.cscf };
  const NAMES = { stay: "Stay on defaults", verify: "Verify own plant only", mill: "Verified rod, current mill", green: "Low-carbon rod", divert: "Sell outside the EU" };
  const LINE_NAMES = { stay: "Defaults", verify: "Own plant only", mill: "Verified rod", green: "Low-carbon rod" };
  const SHOWN = ["mill", "green", "verify", "stay", "divert"];
  const color = (k) => `var(--${k})`;

  function eur(x) {
    const a = Math.abs(x);
    const s = x < 0 ? "-" : "";
    if (a >= 1e9) return `${s}€${(a / 1e9).toFixed(2)}bn`;
    if (a >= 1e6) return `${s}€${(a / 1e6).toFixed(a >= 1e7 ? 0 : 2)}m`;
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

  const tip = $("tip");
  function showTip(evt, html) {
    tip.innerHTML = html;
    tip.hidden = false;
    tip.style.left = `${Math.min(evt.clientX + 14, innerWidth - tip.offsetWidth - 8)}px`;
    tip.style.top = `${evt.clientY - tip.offsetHeight - 10}px`;
  }
  const hideTip = () => (tip.hidden = true);

  // Numbers quoted in prose, one list for every page.
  const h = N.headline;
  const ab = N.ablations;
  const est = N.trade.estimates;
  const tw = N.origins_bolts.find((o) => o.origin === "TW");
  const sortedMills = N.mills.map((m) => m.baseline).sort((a, b) => a - b);
  const millMedian = (sortedMills[4] + sortedMills[5]) / 2;
  const V = {
    payable: pct(h.payable_share_2026), multiple: h.benchmark_multiple.toFixed(1), ratio: Math.round(h.ratio_2026),
    cost27: eur(h.rows[1].cost), pct27: pct(h.rows[1].pct_value), bill26: eur(N.sector.by_year[0].bill), naive26: eur(N.sector.by_year[0].naive),
    saveVerify: eur(N.saving_stay_to_verify_pv), saveMill: eur(N.saving_stay_to_mill_pv), rodShare: pct(N.share_of_prize_from_rod),
    routeTake: pct(1 - ab.green_gap_actual / ab.green_gap_without_route_benchmark), premium: eur(D.defaults.green_premium),
    pStar: eur(N.flips.carbon_price_2034), millFlip: N.flips.mill_vs_green.toFixed(1), sFlip: N.flips.intensity_2028.toFixed(2),
    flipT: Math.round(N.flips.tonnes_mill_pv), priceBase: `€${D.price_base.toFixed(2)}`, millCost: eur(ab.mill_eur_t), twCost: eur(tw.cost),
    sectorPct: pct(N.sector.by_year[0].pct), divertLoss: eur(N.divert_price_loss), euShare: pct(N.markets.EU27.kt / N.world_kt_bolts),
    beta: est.base.beta.toFixed(2), betaSe: est.base.se.toFixed(2), betaOm: est.with_origin_month.beta.toFixed(2), betaOmT: est.with_origin_month.t.toFixed(1),
    placeboT: est.placebo_2025.t.toFixed(1), tests: D.work.tests, stressN: D.work.stress_cases, wSources: D.work.sources, wRows: whole(D.work.trade_rows),
    wDefaults: whole(D.work.default_rows), wBench: whole(D.work.benchmark_rows), wChecks: whole(D.work.js_checks), twBefore: eur(N.buyer_taiwan[0]), twAfter: eur(N.buyer_taiwan[1]),
    plateBefore: N.buyer_shift.plate.before, plateAfter: N.buyer_shift.plate.after, plateOf: N.buyer_shift.plate.of,
    koreaBefore: eur(N.buyer_korea_plate[0]), koreaAfter: eur(-N.buyer_korea_plate[1]), millMedian: millMedian.toFixed(2), sMill: D.defaults.s_mill.toFixed(2),
  };
  document.querySelectorAll("[data-v]").forEach((n) => (n.textContent = V[n.dataset.v]));

  function hbars(host, rows, { best, fmt = eur } = {}) {
    const vals = rows.map((r) => r.v);
    const lo = Math.min(0, ...vals);
    const hi = Math.max(0, ...vals);
    const X = (v) => ((v - lo) / (hi - lo || 1)) * 100;
    host.innerHTML = rows.map((r) => {
      const left = Math.min(X(0), X(r.v));
      const width = Math.max(Math.abs(X(r.v) - X(0)), 0.6);
      const cls = best ? (r.k === best ? "best" : "dim") : "";
      return `<div class="hb ${cls}"><span class="name">${r.name}</span>
        <span class="track"><span class="zero" style="left:${X(0)}%"></span><span class="fill" style="left:${left}%;width:${width}%;background:${r.c}"></span></span>
        <span class="val">${fmt(r.v)}</span></div>`;
    }).join("");
  }

  // The case page: a bolt drawn to scale. The head is free allocation, the shank needs certificates.
  function casePage() {
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
      const y2 = 236;
      const w = Math.max(row.naive * SCALE, 2);
      g.append(el("path", { class: "bolt-outline", fill: "var(--steel)", d: `M${X0} ${y2 - 15}H${X0 + w}V${y2 + 15}H${X0}Z` }));
      const lx = X0 + w + 12;
      if (lx < 640) g.append(el("text", { class: "dim-text", x: lx, y: y2 + 7 }, `${row.naive.toFixed(2)} t on the 2.5% reading`));
      else g.append(el("text", { class: "dim-text", x: X0 + 8, y: y2 + 44 }, `${row.naive.toFixed(2)} t on the 2.5% reading`));
      s.append(g);
      $("boltRead").innerHTML = `
        <div><b>${row.see ? pct(row.net / row.see) : "0%"}</b><span>of embedded emissions is charged</span></div>
        <div><b>${eur(row.cost)}</b><span>a tonne, at €${D.price_base.toFixed(2)} carbon</span></div>
        <div><b>${pct(row.pct_value)}</b><span>of the 2025 EU import price</span></div>
        <div><b>${eur(row.naive_cost)}</b><span>on the 2.5% reading</span></div>`;
      s.setAttribute("aria-label", `In ${row.year}, ${row.see.toFixed(2)} tonnes embedded, ${row.net.toFixed(2)} need certificates, the 2.5% reading implies ${row.naive.toFixed(2)}.`);
    }
    const yr = $("yearRange");
    const setYear = () => { $("yearOut").textContent = D.years[+yr.value]; drawBolt(h.rows[+yr.value]); };
    yr.addEventListener("input", setYear);
    setYear();
    onTheme.push(setYear);
    if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const r = h.rows[0];
      const t0 = performance.now();
      const step = (t) => {
        const k = Math.min((t - t0) / 900, 1);
        if (+yr.value === 0) drawBolt({ ...r, net: r.naive + (r.net - r.naive) * (1 - (1 - k) ** 3) });
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }
    hbars($("answerBars"), SHOWN.map((k) => ({ k, name: NAMES[k], v: N.pv[k], c: color(k) })), { best: N.best });
  }

  // How CBAM works: one tonne through the sum.
  function learnPage() {
    const product = $("l_product"), origin = $("l_origin"), year = $("l_year"), price = $("l_price");
    D.buyer.forEach((b, i) => product.add(new Option(b.name, i)));
    const fillOrigins = () => {
      const keep = origin.value || "IN";
      origin.length = 0;
      D.buyer[+product.value].rows.slice().sort((a, b) => a.name.localeCompare(b.name)).forEach((r) => origin.add(new Option(r.name, r.origin)));
      origin.value = [...origin.options].some((o) => o.value === keep) ? keep : origin.options[0].value;
    };
    price.value = Math.round(D.price_base);
    function render() {
      const r = D.buyer[+product.value].rows.find((x) => x.origin === origin.value);
      const i = +year.value;
      const y = D.years[i];
      const mu = Engine.markUp(rules, y);
      const see = r.d * (1 + mu);
      const f = D.factor.law[i];
      const sefa = f * r.bm[i];
      const net = Math.max(0, see - sefa);
      const p = +price.value;
      $("l_yearOut").textContent = y;
      $("l_priceOut").textContent = `€${p}`;
      const rows = [
        ["Default value for this product and origin", `${r.d.toFixed(3)} t`, "Commission default value file"],
        [`Add the ${y} mark-up of ${pct(mu)}`, `${see.toFixed(3)} t`, "Commission Q&A 4.25"],
        ["CBAM benchmark, Column B", `${r.bm[i].toFixed(3)} t`, "Commission benchmark file"],
        [`CBAM factor for ${y}`, pct(f, 1), "Directive 2003/87/EC, Art. 10a(1a)"],
        ["Free allocation adjustment, benchmark times factor", `${sefa.toFixed(3)} t`, "Reg. 2025/2620 Annex"],
        ["Certificates needed, emissions less adjustment", `${net.toFixed(3)} t`, "Commission Q&A 3.7"],
        ["Certificate price", `€${p}`, "Your setting"],
        ["CBAM cost per tonne of goods", eur(net * p), `${pct((net * p) / r.uv, 1)} of this origin's 2025 import price`],
      ];
      $("l_steps").innerHTML = `<thead><tr><th>Step</th><th class="n">Result</th><th>Where it comes from</th></tr></thead><tbody>${rows.map((x) => `<tr><td>${x[0]}</td><td class="n">${x[1]}</td><td>${x[2]}</td></tr>`).join("")}</tbody>`;
      const naive = see * (1 - f) * p;
      $("l_note").textContent = f > 0
        ? `The 2.5% style reading takes ${pct(1 - f, 1)} of emissions and gives ${eur(naive)} a tonne here. That is right only for a good sitting exactly at the benchmark. This one sits at ${(see / r.bm[i]).toFixed(1)} times it.`
        : "Free allocation has ended by 2034, so every tonne of embedded emissions is charged and the two readings agree.";
    }
    product.addEventListener("input", () => { fillOrigins(); render(); });
    [origin, year, price].forEach((n) => n.addEventListener("input", render));
    fillOrigins();
    render();
  }

  // Decision tool.
  function toolPage() {
    const tabs = { exporter: $("tab-exporter"), buyer: $("tab-buyer") };
    function show(name) {
      Object.entries(tabs).forEach(([k, b]) => {
        const on = k === name;
        b.setAttribute("aria-selected", on);
        b.tabIndex = on ? 0 : -1;
        $(k).hidden = !on;
      });
      if (name === "exporter") drawEdges();
    }
    Object.entries(tabs).forEach(([k, b]) => {
      b.addEventListener("click", () => { show(k); history.replaceState(null, "", `#${k}`); });
      b.addEventListener("keydown", (e) => {
        if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
          const other = k === "exporter" ? "buyer" : "exporter";
          show(other);
          tabs[other].focus();
        }
      });
    });

    const c = (id) => $(`c_${id}`);
    const logT = (p) => Math.round(20 * (5000 / 20) ** (p / 100));
    const logInv = (t) => (100 * Math.log(t / 20)) / Math.log(5000 / 20);
    D.products.forEach((p, i) => c("product").add(new Option(p.name, i)));
    Object.entries(D.products[0].rivals).forEach(([k, r]) => c("rival").add(new Option(r.name, k)));
    c("plant").add(new Option("Use the slider below", ""));
    N.mills.forEach((m) => c("plant").add(new Option(`${m.name}, ${m.rod.toFixed(2)}`, m.rod.toFixed(2))));

    // Sliders snap to steps, so exact inputs live here. Reset must reproduce the report to the euro.
    const state = {};
    const place = (k) => (k === "tonnes" ? logInv(state.tonnes) : state[k]);
    function reset() {
      const d = D.defaults;
      Object.assign(state, {
        product: 0, tonnes: d.tonnes, mill: d.s_mill, price: D.price_base, rival: d.rival, own: d.own, mass: d.mass_ratio,
        low: d.s_low, premium: d.green_premium, verify: d.verify_cost, divert: d.price_loss_divert, rate: d.discount_rate,
      });
      Object.keys(state).forEach((k) => (c(k).value = place(k)));
      c("plant").value = "";
      document.querySelector('input[name="sched"][value="law"]').checked = true;
      update();
    }
    const exporter = () => {
      const p = D.products[state.product];
      return {
        ...p, rival: p.rivals[state.rival], tonnes: state.tonnes, own: state.own, mass_ratio: state.mass, s_mill: state.mill, s_low: state.low,
        verify_cost: state.verify, green_premium: state.premium, price_loss_divert: state.divert,
      };
    };
    const options = () => ({
      price: state.price, rate: state.rate, start: D.defaults.first_verified_year,
      schedule: D.factor[document.querySelector('input[name="sched"]:checked').value],
    });

    function update() {
      const e = exporter();
      const o = options();
      $("o_tonnes").textContent = whole(state.tonnes);
      $("o_mill").textContent = state.mill.toFixed(2);
      $("o_price").textContent = `€${Number.isInteger(o.price) ? o.price : o.price.toFixed(2)}`;
      $("o_own").textContent = state.own.toFixed(2);
      $("o_mass").textContent = state.mass.toFixed(2);
      $("o_low").textContent = state.low.toFixed(1);
      $("o_premium").textContent = `€${whole(state.premium)}`;
      $("o_verify").textContent = `€${whole(state.verify)}`;
      $("o_divert").textContent = `€${whole(state.divert)}`;
      $("o_rate").textContent = pct(o.rate);
      const { best, pv } = Engine.recommend(e, o, rules);
      const lines = { mill: "Buy verified rod from your current mill.", stay: "Stay on default values for now.", verify: "Verify your own plant and keep your current rod.", green: "Move to low-carbon rod.", divert: "Sell outside the EU." };
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
      renderMap(e, o);
      renderSwing(e, o, pv);
    }

    const POS4 = ["stay", "verify", "mill", "green"];
    $("lineLegend").innerHTML = POS4.map((k) => `<span><i style="background:${color(k)}"></i>${LINE_NAMES[k]}</span>`).join("");
    function lineChart(series) {
      const W = 720, H = 260, L = 34, R = 104, T = 10, B = 26;
      const top = Math.ceil(Math.max(...series.flatMap((s) => POS4.map((k) => s[k])))) || 1;
      const X = (i) => L + (i / (series.length - 1)) * (W - L - R);
      const Y = (v) => T + (1 - v / top) * (H - T - B);
      const s = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "Certificates per tonne by position and year" });
      for (let v = 0; v <= top; v += top > 5 ? 2 : 1) {
        s.append(el("line", { x1: L, x2: W - R, y1: Y(v), y2: Y(v), stroke: "var(--rule)", "stroke-width": 1 }));
        s.append(el("text", { x: L - 8, y: Y(v) + 4, "text-anchor": "end" }, v));
      }
      D.years.forEach((y, i) => { if (i % 2 === 0) s.append(el("text", { x: X(i), y: H - 6, "text-anchor": "middle" }, y)); });
      const ends = POS4.map((k) => ({ k, y: Y(series[series.length - 1][k]) })).sort((a, b) => a.y - b.y);
      for (let i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < 15) ends[i].y = ends[i - 1].y + 15;
      POS4.forEach((k) => {
        s.append(el("path", { fill: "none", stroke: color(k), "stroke-width": 2.2, "stroke-linejoin": "round", d: series.map((r, i) => `${i ? "L" : "M"}${X(i)} ${Y(r[k])}`).join("") }));
        s.append(el("text", { x: W - R + 8, y: ends.find((n) => n.k === k).y + 4 }, LINE_NAMES[k]));
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
      $("lineChart").replaceChildren(s);
    }

    // Dependency map: the same sum the engine runs, laid out so a reader can walk it.
    const mPos = $("m_pos");
    POS4.forEach((k) => mPos.add(new Option(NAMES[k], k)));
    mPos.value = "mill";
    let selected = "pv";
    const HEADS = ["Inputs", "Per tonne", "Against the rival", "This year", "2027 to 2034"];

    function graph(e, o) {
      const pos = mPos.value;
      const i = +$("m_year").value;
      const y = D.years[i];
      const f = o.schedule[i];
      const mu = Engine.markUp(rules, y);
      const c4 = Engine.certs(e, i, o.schedule, rules);
      const r = Engine.rivalNet(e.rival, i, o.schedule, rules);
      const hit = Engine.annualHit(e, i, o.price, o.schedule, rules);
      const pv = Engine.presentHit(e, o, rules);
      const t = (v) => `${v.toFixed(2)} t`;
      const n = {};
      const add = (id, col, label, value, kind, what, source, from = [], key) => (n[id] = { id, col, label, value, kind, what, source, from, key });
      const inp = (id, label, value, what, source, key) => add(id, 0, label, value, "input", what, source, [], key);
      if (pos === "stay") {
        inp("d", `${e.name}, India default`, t(e.default), "The Commission's emissions figure for this product from India, used when no verified data exists.", "Commission default value file, 10 Aug 2026");
        inp("mu", `Mark-up ${y}`, pct(mu), "A surcharge on default values that rises to 30% in 2028.", "Commission Q&A 4.25");
        inp("bm", "Benchmark, Column B", t(e.bm_b), "The emissions an efficient EU producer would be allowed for this good, including its steel.", "Commission benchmark file");
      } else {
        inp("own", "Own plant", t(e.own), "Direct emissions from fuel burned in your own process, per tonne of good. The fastener distributors dispute whether this counts. Set it to zero to test their reading.", "Worked fuel example with Reg. 2025/2547 factors", "own");
        inp("mass", "Steel per tonne", e.mass_ratio.toFixed(2), "Tonnes of rod used per tonne of good, including scrap and cut-offs.", "Worked example", "mass");
        if (pos === "verify") {
          inp("dp", "Rod default", t(e.default_precursor), "The default for India's rod. Used when the mill gives no verified figure.", "Commission default value file");
          inp("mu", `Mark-up ${y}`, pct(mu), "Default rod inside an actual calculation still carries the mark-up.", "Commission Q&A 4.25");
        } else if (pos === "mill") {
          inp("rod", "Verified rod", t(e.s_mill), "Your mill's verified figure. The base case is the median of ten plants in India's draft schedule, plus 0.1 for rolling. These are draft crude steel baselines, and no verified CBAM value is public.", "CarbonNeeti summary of draft G.S.R. 517(E)", "mill");
        } else {
          inp("rod", "Low-carbon rod", t(e.s_low), "A verified figure for scrap-based rod. No Indian price or verified value is public.", "ICRA's 0.7 for scrap EAF, plus rolling", "low");
        }
        inp("bma", "Process benchmark", t(e.bm_a), "Column A: the benchmark for the final process step alone.", "Commission benchmark file");
        inp("bmp", "Rod benchmark", t(pos === "green" ? e.bm_precursor_low : e.bm_precursor), pos === "green" ? "Scrap-route rod gets a far lower benchmark, which is why low-carbon rod gains less than it looks." : "Column B for rod on the blast furnace route.", "Commission benchmark file");
      }
      inp("f", `CBAM factor ${y}`, pct(f, 1), "The share of free allocation EU producers still keep. It falls to zero in 2034 under current law.", "Directive 2003/87/EC Art. 10a(1a), printed in EFDA's guide");
      inp("price", "Carbon price", `€${o.price.toFixed(2)}`, "Held flat at the latest quarterly price in the base case. This is no forecast.", "Commission Q3 2026 price, as reported", "price");
      inp("rd", `${e.rival.name} default`, t(e.rival.d), "The rival's own default value. The EU price can rise by the rival's CBAM bill, and the exporter absorbs anything above it.", "Commission default value file");
      inp("tonnes", "EU tonnes a year", whole(e.tonnes), "Annual sales into the EU.", "Your setting", "tonnes");
      if (pos !== "stay") inp("fix", pos === "green" ? "Verification and premium" : "Verification", eur(e.verify_cost + (pos === "green" ? e.green_premium * e.mass_ratio * e.tonnes : 0)), "Yearly verification and compliance cost. Upper end of a press figure, since no verifier publishes a fee.", "Business Standard, Rs 15 to 20 lakh", "verify");
      if (pos === "stay") {
        add("see", 1, "Emissions counted", t(e.default * (1 + mu)), "calc", "Default value plus the mark-up.", "Default times (1 + mark-up)", ["d", "mu"]);
        add("sefa", 1, "Free allocation", t(f * e.bm_b), "calc", "The amount taken off the bill per tonne.", "Factor times benchmark", ["bm", "f"]);
      } else {
        const rodVal = pos === "verify" ? e.default_precursor * (1 + mu) : pos === "mill" ? e.s_mill : e.s_low;
        const bp = pos === "green" ? e.bm_precursor_low : e.bm_precursor;
        add("see", 1, "Emissions counted", t(e.own + e.mass_ratio * rodVal), "calc", "Your plant's emissions plus the emissions in the rod you used.", "Own plant + steel per tonne times rod", pos === "verify" ? ["own", "mass", "dp", "mu"] : ["own", "mass", "rod"]);
        add("sefa", 1, "Free allocation", t(f * (e.bm_a + e.mass_ratio * bp)), "calc", "The benchmark follows the actual route, so cleaner rod earns less of it.", "Factor times (process + steel per tonne times rod benchmark)", ["bma", "mass", "bmp", "f"]);
      }
      add("rnet", 1, `${e.rival.name} certificates`, t(r), "calc", "What the rival's buyer needs per tonne on the rival's default.", "Rival default with mark-up, less free allocation", ["rd", "mu_r", "f"].filter((x) => x !== "mu_r"));
      add("net", 2, "Your certificates", t(c4[pos]), "calc", "Emissions counted less free allocation, floored at zero.", "Commission Q&A 3.7, 4.32", ["see", "sefa"]);
      add("gap", 2, "Gap to the rival", t(c4[pos] - r), "calc", "The certificates the market will not pay for. The exporter absorbs this.", "Your certificates less the rival's", ["net", "rnet"]);
      add("year", 3, `Hit in ${y}`, eur(hit[pos]), "calc", "Gap to the rival, priced, for all your tonnes, plus fixed costs.", "Gap times price times tonnes + fixed costs", pos === "stay" ? ["gap", "price", "tonnes"] : ["gap", "price", "tonnes", "fix"]);
      add("pv", 4, "Present value", eur(pv[pos]), "result", "All years from 2027 to 2034 added up, discounted back to 2027.", `Discounted at ${pct(o.rate)}`, ["year"], undefined);
      return n;
    }

    const links = (n) => {
      const up = new Set();
      const down = new Set();
      const walkUp = (id) => (n[id]?.from || []).forEach((p) => { if (!up.has(p)) { up.add(p); walkUp(p); } });
      const walkDown = (id) => Object.values(n).forEach((x) => { if (x.from.includes(id) && !down.has(x.id)) { down.add(x.id); walkDown(x.id); } });
      walkUp(selected);
      walkDown(selected);
      return { up, down };
    };

    let current = {};
    function renderMap(e, o) {
      $("m_yearOut").textContent = D.years[+$("m_year").value];
      current = graph(e, o);
      if (!current[selected]) selected = "pv";
      const { up, down } = links(current);
      const on = (id) => id === selected || up.has(id) || down.has(id);
      const cols = [0, 1, 2, 3, 4].map((c5) => {
        const items = Object.values(current).filter((x) => x.col === c5).map((x) =>
          `<button type="button" class="node ${x.kind === "input" ? "input" : ""} ${x.kind === "result" ? "result" : ""} ${x.id === selected ? "sel" : ""} ${on(x.id) ? "" : "off"}" data-id="${x.id}"><span>${x.label}</span><b>${x.value}</b></button>`).join("");
        return `<div class="col"><div class="head">${HEADS[c5]}</div>${items}</div>`;
      }).join("");
      $("map").innerHTML = `<svg aria-hidden="true"></svg>${cols}`;
      $("map").querySelectorAll(".node").forEach((b) => {
        b.addEventListener("click", () => { selected = b.dataset.id; update(); $("map").querySelector(`[data-id="${selected}"]`).focus(); });
      });
      drawEdges();
      renderInfo();
    }

    function drawEdges() {
      const svg = $("map").querySelector("svg");
      if (!svg || getComputedStyle(svg).display === "none" || $("exporter").hidden) return;
      const box = $("map").getBoundingClientRect();
      const { up, down } = links(current);
      const pos = (id) => {
        const r = $("map").querySelector(`[data-id="${id}"]`)?.getBoundingClientRect();
        return r && { l: r.left - box.left, r: r.right - box.left, y: r.top + r.height / 2 - box.top };
      };
      svg.innerHTML = "";
      Object.values(current).forEach((x) => x.from.forEach((p) => {
        const a = pos(p);
        const b = pos(x.id);
        if (!a || !b) return;
        const mid = (a.r + b.l) / 2;
        const lit = (x.id === selected || down.has(x.id)) && (p === selected || down.has(p) || up.has(p)) || (up.has(x.id) || x.id === selected) && up.has(p);
        svg.append(el("path", { class: `edge ${lit ? "on" : ""}`, d: `M${a.r} ${a.y}C${mid} ${a.y} ${mid} ${b.y} ${b.l} ${b.y}` }));
      }));
    }
    addEventListener("resize", drawEdges);

    let sliderKey = null;
    function renderInfo() {
      const x = current[selected];
      const names = (ids) => ids.map((i) => current[i].label).join(", ");
      const feeds = Object.values(current).filter((y) => y.from.includes(x.id)).map((y) => y.id);
      const body = `<h3>${x.label}: ${x.value}</h3><p>${x.what}</p>
        <p class="meta">${x.kind === "input" ? "Source" : "Sum"}: ${x.source}</p>
        ${x.from.length ? `<p class="meta">Built from: ${names(x.from)}</p>` : ""}
        ${feeds.length ? `<p class="meta">Feeds: ${names(feeds)}</p>` : ""}`;
      let text = $("infoText");
      if (!text) {
        $("nodeInfo").innerHTML = '<div id="infoText"></div><div id="infoCtl"></div>';
        text = $("infoText");
      }
      text.innerHTML = body;
      const ctl = $("infoCtl");
      if (x.key !== sliderKey) {
        sliderKey = x.key;
        ctl.innerHTML = "";
        if (x.key) {
          const src = c(x.key);
          const s = src.cloneNode(false);
          s.id = "infoSlider";
          s.setAttribute("aria-label", `Change ${x.label}`);
          s.addEventListener("input", () => { set(x.key, s.value); src.value = s.value; });
          ctl.append(s);
        }
      }
      if ($("infoSlider") && document.activeElement !== $("infoSlider")) $("infoSlider").value = place(x.key);
    }

    function set(key, raw) {
      state[key] = key === "tonnes" ? logT(+raw) : key === "rival" ? raw : +raw;
      if (key === "mill") c("plant").value = "";
      update();
    }

    // Which inputs move the answer.
    const unit = { price: (v) => `€${v}`, s_mill: (v) => v.toFixed(2), tonnes: whole, verify_cost: eur, own: (v) => v.toFixed(1), mass_ratio: (v) => v.toFixed(2), rate: (v) => pct(v) };
    function renderSwing(e, o, pv) {
      const rows = Engine.sensitivity(e, o, rules, D.sensitivity_ranges);
      const base = pv.stay - pv.mill;
      const lo = Math.min(0, base, ...rows.map((r) => Math.min(r.at_low, r.at_high)));
      const hi = Math.max(base, ...rows.map((r) => Math.max(r.at_low, r.at_high)));
      const X = (v) => ((v - lo) / (hi - lo || 1)) * 100;
      $("swing").innerHTML = rows.map((r) => {
        const a = Math.min(r.at_low, r.at_high);
        const b = Math.max(r.at_low, r.at_high);
        const flip = [r.best_low, r.best_high].find((k) => k !== "mill");
        return `<div class="sw"><span>${r.label}${flip ? `<small>At one end the best position becomes ${NAMES[flip].toLowerCase()}</small>` : ""}</span>
          <span class="track"><span class="bar" style="left:${X(a)}%;width:${Math.max(X(b) - X(a), 0.5)}%"></span><span class="base" style="left:${X(base)}%"></span>
          <span class="ends"><span>${unit[r.key](r.low)}: ${eur(r.at_low)}</span><span>${unit[r.key](r.high)}: ${eur(r.at_high)}</span></span></span></div>`;
      }).join("");
    }

    document.querySelectorAll("#controls input, #controls select").forEach((n) => n.addEventListener("input", () => {
      if (n.type === "radio") return update();
      const key = n.id.replace("c_", "");
      if (key === "plant") {
        if (n.value) { state.mill = +n.value; c("mill").value = n.value; update(); }
        return undefined;
      }
      return set(key, n.value);
    }));
    $("reset").addEventListener("click", reset);
    mPos.addEventListener("input", () => { selected = "pv"; sliderKey = null; update(); });
    $("m_year").addEventListener("input", update);
    reset();
    if (location.hash === "#buyer") show("buyer");

    // The EU buyer's view.
    const bp = $("b_product"), by = $("b_year"), bc = $("b_price");
    D.buyer.forEach((b, i) => bp.add(new Option(b.name, i)));
    bc.value = Math.round(D.price_base);
    function renderBuyer() {
      const b = D.buyer[+bp.value];
      const i = +by.value;
      const p = +bc.value;
      $("b_yearOut").textContent = D.years[i];
      $("b_priceOut").textContent = `€${p}`;
      const rows = Engine.landed(b.rows, i, p, D.factor.law, rules);
      const peak = Math.max(...rows.map((r) => r.landed));
      $("b_bars").innerHTML = rows.map((r) => `<div class="st ${r.origin === "IN" ? "me" : ""}" title="${r.name}: price ${eur(r.uv)}, CBAM ${eur(r.cbam)}">
        <span class="name">${r.name}</span><span class="track"><span class="a" style="width:${(r.uv / peak) * 100}%"></span><span class="b" style="width:${(r.cbam / peak) * 100}%"></span></span>
        <span class="val">${eur(r.landed)}</span></div>`).join("");
      const byPrice = [...rows].sort((x, y) => x.uv - y.uv);
      const india = rows.findIndex((r) => r.origin === "IN") + 1;
      const was = byPrice.findIndex((r) => r.origin === "IN") + 1;
      const head = `${rows[0].name} is the cheapest origin on landed cost at ${eur(rows[0].landed)} a tonne.`;
      const tail = india === 0 ? "India has under 2,000 tonnes in this product." : india === was
        ? `India stays number ${india} of ${rows.length} with CBAM added.`
        : `India moves from number ${was} to number ${india} of ${rows.length} once CBAM is added.`;
      $("b_verdict").innerHTML = `${head}<small>${tail}</small>`;
    }
    [bp, by, bc].forEach((n) => n.addEventListener("input", renderBuyer));
    renderBuyer();
  }

  // Evidence page.
  function evidencePage() {
    $("checkTable").innerHTML = `<thead><tr><th>Source</th><th>Case</th><th class="n">Published</th><th class="n">This model</th></tr></thead><tbody>${
      N.checks.map((c) => `<tr><td>${c.who}</td><td>${c.case}${c.note ? `<br><small>${c.note}</small>` : ""}</td><td class="n">€${c.published.toFixed(c.who === "EFDA" ? 2 : 0)}</td><td class="n">€${c.model.toFixed(2)}</td></tr>`).join("")}</tbody>`;

    const lo = 2.2, hi = 5.8;
    const X = (v) => ((v - lo) / (hi - lo)) * 100;
    const flip = N.flips.mill_vs_green;
    const def = N.flips.intensity_2028;
    $("millTable").innerHTML = `<thead><tr><th>Plant</th><th class="n">Baseline</th><th class="lanehead"><span style="left:${X(flip)}%;transform:translateX(-50%)">${flip.toFixed(1)}</span><span style="left:${X(def)}%;transform:translateX(-100%)">${def.toFixed(2)}</span></th></tr></thead><tbody>${
      N.mills.map((m) => `<tr><td>${m.name}</td><td class="n">${m.baseline.toFixed(2)}</td><td><div class="lane"><span class="line" style="left:${X(flip)}%"></span><span class="line fault" style="left:${X(def)}%"></span><span class="dot" style="left:${X(m.rod)}%" title="${m.rod.toFixed(2)} with rolling"></span></div></td></tr>`).join("")}</tbody>`;

    const shownYears = [2026, 2028, 2030, 2032, 2034];
    const lines = [...N.sector.top_lines].sort((a, b) => b.pct[2026] - a.pct[2026]);
    const peak = Math.max(...lines.map((l) => l.pct[2034]));
    const hex = (s) => s.trim().replace("#", "").match(/../g).map((x) => parseInt(x, 16));
    const lum = (rgb) => { const [r, g, b] = rgb.map((v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
    function renderHeat() {
      const css = getComputedStyle(root);
      const a = hex(css.getPropertyValue("--stay"));
      const b = hex(css.getPropertyValue("--bg"));
      const inkDark = hex("#13293d");
      $("heat").innerHTML = `<thead><tr><th scope="col">Product</th><th scope="col">2025 trade</th>${shownYears.map((y) => `<th scope="col">${y}</th>`).join("")}</tr></thead><tbody>${
        lines.map((l) => `<tr title="${l.label.replace(/"/g, "&quot;")}"><td>${l.name}</td><td>${eur(l.value)}</td>${shownYears.map((y) => {
          const t = (l.pct[y] / peak) * 0.9 + 0.04;
          const rgb = a.map((v, i) => Math.round(v * t + b[i] * (1 - t)));
          const L = lum(rgb);
          const onWhite = 1.05 / (L + 0.05);
          const onInk = (L + 0.05) / (lum(inkDark) + 0.05);
          return `<td class="c" style="background:rgb(${rgb});color:${onWhite > onInk ? "#fff" : "#13293d"}">${pct(l.pct[y])}</td>`;
        }).join("")}</tr>`).join("")}</tbody>`;
    }
    renderHeat();
    onTheme.push(renderHeat);

    const ranks = [["Hot-rolled plate", N.buyer_shift.plate], ["Galvanised sheet", N.buyer_shift.sheet], ["Bolts and screws", N.buyer_shift.bolts], ["Other steel articles", N.buyer_shift.articles]];
    $("rankTable").innerHTML = `<thead><tr><th>Product</th><th class="n">By price alone</th><th class="n">With CBAM</th><th class="n">Origins compared</th></tr></thead><tbody>${
      ranks.map(([n, r]) => `<tr><td>${n}</td><td class="n">${r.before}</td><td class="n">${r.after}</td><td class="n">${r.of}</td></tr>`).join("")}</tbody>`;

    hbars($("originBars"), N.origins_bolts.filter((o) => o.tonnes >= 2000 || o.origin === "IN").map((o) => ({
      k: o.origin, name: `${o.name} (${o.default.toFixed(2)})`, v: o.cost, c: o.origin === "IN" ? "var(--stay)" : "var(--steel)",
    })));

    (function sector() {
      const W = 720, H = 280, L = 44, R = 8, T = 16, B = 26;
      const rows = N.sector.by_year;
      const top = Math.ceil(Math.max(...rows.map((r) => r.bill)) / 5e8) * 5e8;
      const X = (i) => L + (i + 0.5) * ((W - L - R) / rows.length);
      const Y = (v) => T + (1 - v / top) * (H - T - B);
      const s = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "India's CBAM bill by year against the 2.5% reading" });
      for (let v = 0; v <= top; v += 5e8) {
        s.append(el("line", { x1: L, x2: W - R, y1: Y(v), y2: Y(v), stroke: "var(--rule)" }));
        s.append(el("text", { x: L - 8, y: Y(v) + 4, "text-anchor": "end" }, v / 1e6));
      }
      const w = 22;
      rows.forEach((r, i) => {
        const a = el("rect", { x: X(i) - w - 1, y: Y(r.bill), width: w, height: Y(0) - Y(r.bill), rx: 4, fill: "var(--stay)" });
        const b = el("rect", { x: X(i) + 1, y: Y(r.naive), width: w, height: Math.max(Y(0) - Y(r.naive), 1), rx: 4, fill: "var(--steel)" });
        [a, b].forEach((n) => {
          n.addEventListener("pointermove", (evt) => showTip(evt, `<b>${r.year}</b><br>The rule: ${eur(r.bill)}<br>2.5% reading: ${eur(r.naive)}<br>${pct(r.pct)} of 2025 value`));
          n.addEventListener("pointerleave", hideTip);
          s.append(n);
        });
        s.append(el("text", { x: X(i), y: H - 6, "text-anchor": "middle" }, r.year));
      });
      $("sectorChart").append(s);
      $("sectorLegend").innerHTML = '<span><i class="block" style="background:var(--stay)"></i>The rule</span><span><i class="block" style="background:var(--steel)"></i>The 2.5% reading</span>';
    })();

    const markets = N.markets;
    const ORDER = ["EU27", "US", "Rest of world", "UK"];
    const TERMS = { EU27: "CBAM from 2026", US: "Section 232, reported at 25 to 50%", "Rest of world": "No carbon border charge found", UK: "Own CBAM from January 2027" };
    $("markets").innerHTML = `<thead><tr><th>Destination</th><th class="n">Thousand tonnes</th><th class="n">USD per kg</th><th>Barrier</th></tr></thead><tbody>${
      ORDER.map((k) => `<tr><td>${k === "EU27" ? "EU" : k}</td><td class="n">${markets[k].kt.toFixed(1)}</td><td class="n">${markets[k].usd_kg.toFixed(2)}</td><td>${TERMS[k]}</td></tr>`).join("")}</tbody>`;

    (function events() {
      const W = 720, H = 260, L = 40, R = 12, T = 12, B = 26;
      const pts = [{ period: "2023H1", beta: 0, se: 0 }, ...N.trade.event_study];
      const up = Math.ceil(Math.max(...pts.map((p) => p.beta + 1.96 * p.se)));
      const dn = Math.floor(Math.min(...pts.map((p) => p.beta - 1.96 * p.se)));
      const step = (W - L - R) / pts.length;
      const X = (i) => L + (i + 0.5) * step;
      const Y = (v) => T + ((up - v) / (up - dn)) * (H - T - B);
      const s = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "Event study of EU imports by burden" });
      const first = pts.findIndex((p) => p.period === "2026H1");
      s.append(el("rect", { x: X(first) - step / 2, y: T, width: W - R - (X(first) - step / 2), height: H - T - B, fill: "var(--mill)", opacity: 0.1 }));
      s.append(el("text", { x: W - R - 6, y: T + 16, "text-anchor": "end" }, "CBAM in force"));
      for (let v = dn; v <= up; v++) {
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
  }

  // How I worked.
  function methodPage() {
    const st = (name) => N.stress.find((r) => r.case === name);
    const attacks = [
      ["The Commission says CBAM applies only to the share without free allowances. Isn't 2.5% right?",
        `Right at the benchmark and wrong above it. Q&A 3.7 subtracts a benchmark-based amount, and EFDA prints the same formula. India's default for bolts is ${V.multiple} times that benchmark.`],
      ["No Indian mill has published a verified figure. Your answer rests on a guess.",
        `It rests on draft baselines for ten named plants, and that is its weakest point. Across the range, from ${eur(st("Cleanest plant in the schedule (2.46)").mill)} to ${eur(st("Dirtiest plant in the schedule (3.31)").mill)}, verified rod stays first. Above ${V.millFlip} low-carbon rod takes over.`],
      ["Small re-rolling mills are not in that list, and they may supply your exporter.",
        "True, and it matters. Any verified figure below the marked-up default still beats staying on defaults, but the first real test is whether those mills can get verified at all. That is the first interview question."],
      ["The verification cost is one press figure.",
        `Treble it and the trigger moves from ${whole(st("Base case").flip_tonnes)} to ${whole(st("Verification costs three times more").flip_tonnes)} tonnes a year.`],
      ["Verifiers will not get to fastener makers in time.",
        `EFDA expects a bottleneck for 2026 imports, so the base case starts in 2027. If verified data slips to 2029 the ranking holds, and the hit stays at ${eur(st("First verified year slips to 2029").mill)}.`],
      ["EFDA says forging is outside the boundary, and your model counts it.",
        `I keep it in because that is the cautious side. Setting it to zero moves the verified-rod hit from ${eur(st("Base case").mill)} to ${eur(st("Forging outside the boundary (own plant 0)").mill)}, and the answer stays the same.`],
      ["The importer pays CBAM, so why should an exporter care?",
        "A buyer will not pay more than the next supplier's landed cost. The gap to that rival comes out of the exporter's price, whoever signs the declaration."],
      ["Rivals will verify too.",
        "Then the EU price rises by less and everyone's hit grows. The ranking stays the same, because the rival term cancels between positions that stay in the EU."],
      ["The EU may slow the phase-out.",
        `COM(2026) 616 moves the verified-rod hit from ${eur(st("Base case").mill)} to ${eur(st("COM(2026) 616 slower phase-out").mill)}. The gap between defaults and verified data barely depends on the schedule.`],
      ["Trade has not fallen, so is this a real problem?",
        "That is unproven either way. No certificate has been sold and the data ends in August 2026. The case rests on the arithmetic of the rule, which practitioners publish too."],
    ];
    $("attacks").innerHTML = `<thead><tr><th>Attack</th><th>Answer</th></tr></thead><tbody>${attacks.map((a) => `<tr><td>${a[0]}</td><td>${a[1]}</td></tr>`).join("")}</tbody>`;
    $("stress").innerHTML = `<thead><tr><th>Case</th><th>Best position</th><th class="n">Defaults</th><th class="n">Verified rod</th><th class="n">Trigger, t/yr</th></tr></thead><tbody>${
      N.stress.map((r) => `<tr><td>${r.case}</td><td>${NAMES[r.answer]}</td><td class="n">${eur(r.stay)}</td><td class="n">${eur(r.mill)}</td><td class="n">${whole(r.flip_tonnes)}</td></tr>`).join("")}</tbody>`;
    const ABLATE = [["Defaults in 2027, as the rule stands", ab.stay_eur_t], ["Take away free allocation", ab.without_free_allocation], ["Take away the mark-up", ab.without_mark_up], ["Give India Taiwan's default", ab.if_india_had_taiwan_default], ["Verified rod instead", ab.mill_eur_t],
      ["Low-carbon rod's edge over verified rod, if the benchmark ignored route", ab.green_gap_without_route_benchmark], ["Low-carbon rod's edge as the rule stands", ab.green_gap_actual]];
    $("ablate").innerHTML = `<thead><tr><th>Ablation, bolts in 2027</th><th class="n">EUR per tonne</th></tr></thead><tbody>${ABLATE.map((a) => `<tr><td>${a[0]}</td><td class="n">${eur(a[1])}</td></tr>`).join("")}</tbody>`;
    $("assumptions").innerHTML = `<thead><tr><th>Assumption</th><th class="n">Value</th><th>Why this value</th></tr></thead><tbody>${
      D.assumptions.map((a) => `<tr><td>${a.name}</td><td class="n">${a.value} ${a.unit}</td><td>${a.why}</td></tr>`).join("")}</tbody>`;
  }

  // Sources.
  function sourcesPage() {
    const TAG = { PRIMARY: "Primary", OFFICIAL_DATA: "Official data", SECONDARY: "Secondary" };
    const buttons = [...document.querySelectorAll(".filters button")];
    function render(tag) {
      const rows = D.sources.filter((s) => !tag || s.tag === tag);
      $("sourceList").innerHTML = `<tbody>${rows.map((s) => `<tr><td>${TAG[s.tag]}</td><td><a href="${s.url}">${s.title}</a></td></tr>`).join("")}</tbody>`;
      buttons.forEach((b) => b.setAttribute("aria-pressed", b.dataset.tag === tag));
    }
    buttons.forEach((b) => b.addEventListener("click", () => render(b.dataset.tag)));
    render("");
  }

  ({ case: casePage, learn: learnPage, tool: toolPage, evidence: evidencePage, method: methodPage, sources: sourcesPage })[page]();
})();
