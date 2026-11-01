(async function () {
  const $ = (id) => document.getElementById(id);
  const page = document.body.dataset.page;
  const SVG = "http://www.w3.org/2000/svg";
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

  // Phone menu.
  $("menu").addEventListener("click", () => {
    const open = $("links").classList.toggle("open");
    $("menu").setAttribute("aria-expanded", open);
    $("menu").textContent = open ? "Close" : "Menu";
  });

  let D;
  try {
    const r = await fetch("data.json?v=13");
    if (!r.ok) throw new Error(r.status);
    D = await r.json();
  } catch {
    $("status").innerHTML = 'The figures did not load. Reload the page, or read the <a style="color:#2997ff" href="https://github.com/Vedantk910/cbam-exposure-case/blob/main/report/decision_page.md">decision page on GitHub</a>.';
    document.querySelectorAll(".reveal").forEach((n) => n.classList.add("in"));
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

  // Sliders show their filled length through --v.
  const fill = (n) => n.style.setProperty("--v", `${((n.value - n.min) / (n.max - n.min)) * 100}%`);
  const fillAll = () => document.querySelectorAll('input[type="range"]').forEach(fill);
  document.addEventListener("input", (e) => { if (e.target.matches?.('input[type="range"]')) fill(e.target); });

  // Numbers quoted in prose, one list for every page.
  const h = N.headline;
  const ab = N.ablations;
  const est = N.trade.estimates;
  const tw = N.origins_bolts.find((o) => o.origin === "TW");
  const sortedMills = N.mills.map((m) => m.baseline).sort((a, b) => a - b);
  const millMedian = (sortedMills[4] + sortedMills[5]) / 2;
  const V = {
    payable: pct(h.payable_share_2026), multiple: h.benchmark_multiple.toFixed(1), ratio: Math.round(h.ratio_2026), ratioX: `${Math.round(h.ratio_2026)}×`,
    cost27: eur(h.rows[1].cost), pct27: pct(h.rows[1].pct_value), bill26: eur(N.sector.by_year[0].bill), naive26: eur(N.sector.by_year[0].naive),
    saveVerify: eur(N.saving_stay_to_verify_pv), saveMill: eur(N.saving_stay_to_mill_pv), rodShare: pct(N.share_of_prize_from_rod),
    routeTake: pct(1 - ab.green_gap_actual / ab.green_gap_without_route_benchmark), premium: eur(D.defaults.green_premium),
    pStar: eur(N.flips.carbon_price_2034), millFlip: N.flips.mill_vs_green.toFixed(1), sFlip: N.flips.intensity_2028.toFixed(2),
    flipT: Math.round(N.flips.tonnes_mill_pv), flipTU: `${Math.round(N.flips.tonnes_mill_pv)} t`, priceBase: `€${D.price_base.toFixed(2)}`, millCost: eur(ab.mill_eur_t), twCost: eur(tw.cost),
    sectorPct: pct(N.sector.by_year[0].pct), divertLoss: eur(N.divert_price_loss), euShare: pct(N.markets.EU27.kt / N.world_kt_bolts),
    beta: est.base.beta.toFixed(2), betaSe: est.base.se.toFixed(2), betaOm: est.with_origin_month.beta.toFixed(2), betaOmT: est.with_origin_month.t.toFixed(1),
    placeboT: est.placebo_2025.t.toFixed(1), tests: D.work.tests, stressN: D.work.stress_cases, wSources: D.work.sources, wRows: whole(D.work.trade_rows),
    wDefaults: whole(D.work.default_rows), wBench: whole(D.work.benchmark_rows), wChecks: whole(D.work.js_checks), twBefore: eur(N.buyer_taiwan[0]), twAfter: eur(N.buyer_taiwan[1]),
    plateBefore: N.buyer_shift.plate.before, plateAfter: N.buyer_shift.plate.after, plateOf: N.buyer_shift.plate.of,
    boltBefore: N.buyer_shift.bolts.before, boltAfter: N.buyer_shift.bolts.after, boltOf: N.buyer_shift.bolts.of,
    scopeValue: eur(N.sector.scope_value), koreaBefore: eur(N.buyer_korea_plate[0]), koreaAfter: eur(-N.buyer_korea_plate[1]), millMedian: millMedian.toFixed(2), sMill: D.defaults.s_mill.toFixed(2),
  };
  document.querySelectorAll("[data-v]").forEach((n) => (n.textContent = V[n.dataset.v]));

  // Count a figure up from zero, keeping its prefix, suffix and decimals, ending on the exact text.
  function countUp(node, duration = 1400, from = 0) {
    const text = node.textContent;
    const m = text.match(/-?[\d,]+(\.\d+)?/);
    if (!m || calm) return;
    const end = parseFloat(m[0].replace(/,/g, ""));
    const dec = (m[1] || "").length - 1;
    const grouped = m[0].includes(",");
    const t0 = performance.now();
    const step = (t) => {
      const k = clamp((t - t0) / duration);
      const v = from + (end - from) * (1 - (1 - k) ** 4);
      const shown = grouped ? Math.round(v).toLocaleString("en-GB") : v.toFixed(Math.max(dec, 0));
      node.textContent = k < 1 ? text.replace(m[0], shown) : text;
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  // Entry effects: one shared observer, each element fires once.
  const seen = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (!e.isIntersecting) return;
    const n = e.target;
    n.classList.add("in");
    seen.unobserve(n);
    if (n.classList.contains("count")) countUp(n);
    if (n.classList.contains("grow") || n.classList.contains("chart")) setTimeout(() => n.classList.add("settled"), 1700);
  }), { threshold: 0.08, rootMargin: "0px 0px -6% 0px" });
  const watch = () => document.querySelectorAll(".reveal:not(.in), .grow:not(.in), .chart:not(.in), .count:not(.in)").forEach((n) => seen.observe(n));

  // Everything tied to scroll position runs in one frame callback.
  const onScroll = [];
  let ticking = false;
  const frame = () => { ticking = false; onScroll.forEach((f) => f()); };
  const kick = () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };
  addEventListener("scroll", kick, { passive: true });
  addEventListener("resize", kick);

  function timelineFill() {
    const t = $("timeline");
    if (!t || calm) return;
    onScroll.push(() => {
      const r = t.getBoundingClientRect();
      t.style.setProperty("--p", clamp((innerHeight * 0.72 - r.top) / r.height).toFixed(3));
    });
  }

  function hbars(host, rows, { best, fmt = eur } = {}) {
    const vals = rows.map((r) => r.v);
    const lo = Math.min(0, ...vals);
    const hi = Math.max(0, ...vals);
    const X = (v) => ((v - lo) / (hi - lo || 1)) * 100;
    if (host.children.length === rows.length) {
      rows.forEach((r, i) => {
        const row = host.children[i];
        row.className = `hb ${best ? (r.k === best ? "best" : "dim") : ""}`;
        const f = row.querySelector(".fill");
        f.style.left = `${Math.min(X(0), X(r.v))}%`;
        f.style.width = `${Math.max(Math.abs(X(r.v) - X(0)), 0.6)}%`;
        row.querySelector(".zero").style.left = `${X(0)}%`;
        row.querySelector(".val").textContent = fmt(r.v);
      });
      return;
    }
    host.innerHTML = rows.map((r) => {
      const left = Math.min(X(0), X(r.v));
      const width = Math.max(Math.abs(X(r.v) - X(0)), 0.6);
      const cls = best ? (r.k === best ? "best" : "dim") : "";
      return `<div class="hb ${cls}"><span class="name">${r.name}</span>
        <span class="track"><span class="zero" style="left:${X(0)}%"></span><span class="fill" style="left:${left}%;width:${width}%;background:${r.c}"></span></span>
        <span class="val">${fmt(r.v)}</span></div>`;
    }).join("");
  }

  // The case page.
  function casePage() {
    // A machined bolt to scale. The head is free allocation and the shank needs certificates.
    const X0 = 60;
    const SCALE = 1080 / 7.6;
    const svg = $("boltSvg");
    const defs = el("defs");
    const shade = (id, stops) => {
      const g = el("linearGradient", { id, x1: 0, y1: 0, x2: 0, y2: 1 });
      stops.forEach(([o, c]) => g.append(el("stop", { offset: o, "stop-color": c })));
      defs.append(g);
    };
    shade("steelG", [[0, "#6e6e73"], [0.18, "#d1d1d6"], [0.34, "#f5f5f7"], [0.55, "#aeaeb2"], [1, "#48484a"]]);
    shade("emberG", [[0, "#8f2a12"], [0.2, "#e8562e"], [0.36, "#ff9a6b"], [0.6, "#d4441f"], [1, "#6d1d0a"]]);
    shade("stubG", [[0, "#636366"], [0.35, "#c7c7cc"], [1, "#48484a"]]);
    svg.append(defs);
    const layer = el("g");
    svg.append(layer);
    let stepNow = -1;

    function drawBolt(row, step) {
      layer.replaceChildren();
      const head = row.sefa * SCALE;
      const shank = row.net * SCALE;
      const cy = 148;
      const end = X0 + head + shank;
      const top = 30;
      const dim = el("g", { class: "dim-g", opacity: step === 0 || step === 4 ? 1 : 0.35 });
      dim.append(el("path", { class: "dim-line", d: `M${X0} ${top - 10}V${cy - 58}M${end} ${top - 10}V${cy - 30}M${X0} ${top}H${end}M${X0 - 6} ${top + 6}l12 -12M${end - 6} ${top + 6}l12 -12` }));
      dim.append(el("text", { class: "dim-text", x: X0 + 10, y: top - 9 }, `${row.see.toFixed(2)} t embedded`));
      layer.append(dim);
      const x1 = X0 + head;
      const shankG = el("g", { class: "bolt-shank", opacity: step === 1 ? 0.45 : 1 });
      shankG.append(el("path", { fill: "url(#emberG)", d: `M${x1} ${cy - 40}H${end - 12}L${end} ${cy - 28}V${cy + 28}L${end - 12} ${cy + 40}H${x1}Z` }));
      for (let x = x1 + 14; x < end - 12; x += 11) shankG.append(el("path", { stroke: "#000", "stroke-opacity": 0.26, "stroke-width": 2, d: `M${x} ${cy - 40}l7 80` }));
      layer.append(shankG);
      if (head > 1) {
        const headG = el("g", { class: "bolt-head", opacity: step === 2 ? 0.45 : 1 });
        const r = Math.min(10, head / 4);
        headG.append(el("path", { fill: "url(#steelG)", d: `M${X0 + r} ${cy - 66}H${x1}V${cy + 66}H${X0 + r}Q${X0} ${cy + 66} ${X0} ${cy + 54}V${cy - 54}Q${X0} ${cy - 66} ${X0 + r} ${cy - 66}Z` }));
        headG.append(el("path", { stroke: "#000", "stroke-opacity": 0.3, "stroke-width": 1.5, d: `M${X0 + 3} ${cy - 26}H${x1}M${X0 + 3} ${cy + 26}H${x1}` }));
        layer.append(headG);
      }
      if (shank > 200) layer.append(el("text", { class: "dim-text", x: x1 + 14, y: cy + 72 }, `${row.net.toFixed(2)} t needs certificates`));
      if (head > 150) layer.append(el("text", { class: "dim-text", x: X0 + 4, y: cy + 96 }, `${row.sefa.toFixed(2)} t free allocation`));
      const y2 = 296;
      const w = Math.max(row.naive * SCALE, 3);
      layer.append(el("rect", { class: "bolt-stub", x: X0, y: y2 - 14, width: w, height: 28, rx: 4, fill: "url(#stubG)", opacity: step >= 3 ? 1 : 0.4 }));
      const lx = X0 + w + 14;
      if (lx < 860) layer.append(el("text", { class: "dim-text", x: lx, y: y2 + 7 }, `${row.naive.toFixed(2)} t on the 2.5% reading`));
      $("boltRead").innerHTML = `
        <div><b>${pct(row.see ? row.net / row.see : 0)}</b><span>of embedded emissions charged</span></div>
        <div><b>${eur(row.cost)}</b><span>a tonne, at €${D.price_base.toFixed(2)} carbon</span></div>
        <div><b>${pct(row.pct_value)}</b><span>of the 2025 EU import price</span></div>`;
      svg.setAttribute("aria-label", `In ${Math.round(row.year)}, ${row.see.toFixed(2)} tonnes embedded, ${row.net.toFixed(2)} need certificates, the 2.5% reading implies ${row.naive.toFixed(2)}.`);
    }
    const lerp = (a, b, k) => Object.fromEntries(Object.keys(a).map((key) => [key, a[key] + (b[key] - a[key]) * k]));
    const at = (t) => {
      const i = Math.min(Math.floor(t), h.rows.length - 2);
      return lerp(h.rows[i], h.rows[i + 1], t - i);
    };
    $("years").innerHTML = D.years.map((y) => `<span>${y}</span>`).join("");
    const caps = [...$("caps").children];
    const yearMarks = [...$("years").children];
    function paint(p) {
      // First half explains the drawing at 2026. Second half runs the years.
      const step = p < 0.12 ? 0 : p < 0.26 ? 1 : p < 0.4 ? 2 : p < 0.54 ? 3 : 4;
      const t = clamp((p - 0.54) / 0.42) * 8;
      if (step !== stepNow) {
        stepNow = step;
        caps.forEach((c, i) => c.classList.toggle("on", i === step));
      }
      yearMarks.forEach((m, i) => m.classList.toggle("on", i === Math.round(t)));
      drawBolt(at(t), step);
    }
    const yr = $("yearRange");
    yr.addEventListener("input", () => { $("yearOut").textContent = D.years[+yr.value]; drawBolt(h.rows[+yr.value], 4); yearMarks.forEach((m, i) => m.classList.toggle("on", i === +yr.value)); });

    if (calm) {
      caps.forEach((c) => c.classList.add("on"));
      drawBolt(h.rows[0], 4);
      yearMarks[0].classList.add("on");
    } else {
      const story = $("story");
      const hero = $("heroNum");
      onScroll.push(() => {
        const r = story.getBoundingClientRect();
        if (r.bottom > -200 && r.top < innerHeight + 200) paint(clamp(-r.top / (r.height - (innerHeight - 52))));
        if (scrollY < innerHeight * 1.2) {
          const k = clamp(scrollY / (innerHeight * 0.9));
          hero.style.transform = `scale(${1 - k * 0.14}) translateY(${k * 34}px)`;
          hero.style.opacity = 1 - k * 0.65;
        }
      });
      paint(0);
      countUp(hero, 1500, 2.5);
    }

    // Words fill in as they are read.
    const statement = $("statement");
    const text = statement.textContent;
    statement.setAttribute("aria-label", text);
    statement.innerHTML = text.split(" ").map((w) => `<span class="w" aria-hidden="true">${w}</span>`).join(" ");
    const words = [...statement.children];
    if (!calm) onScroll.push(() => {
      const r = statement.getBoundingClientRect();
      const p = clamp((innerHeight * 0.86 - r.top) / (r.height + innerHeight * 0.34));
      const lit = p * (words.length + 2);
      words.forEach((w, i) => (w.style.opacity = lit > i ? 1 : 0.16));
    });

    hbars($("answerBars"), SHOWN.map((k) => ({ k, name: NAMES[k], v: N.pv[k], c: color(k) })), { best: N.best });
    $("vizStub").style.width = `${100 / h.ratio_2026}%`;

    // Number gallery.
    const rail = $("rail");
    const slides = [...rail.children];
    const dots = $("railDots");
    const go = (i) => slides[clamp(i, 0, slides.length - 1)].scrollIntoView({ inline: "center", block: "nearest", behavior: calm ? "auto" : "smooth" });
    dots.innerHTML = slides.map((_, i) => `<button type="button" aria-label="Number ${i + 1}"></button>`).join("");
    const dotBtns = [...dots.children];
    dotBtns.forEach((b, i) => b.addEventListener("click", () => go(i)));
    const current = () => {
      const c = rail.getBoundingClientRect().left + rail.clientWidth / 2;
      return slides.reduce((best, s, i) => {
        const r = s.getBoundingClientRect();
        const d = Math.abs(r.left + r.width / 2 - c);
        return d < best.d ? { i, d } : best;
      }, { i: 0, d: Infinity }).i;
    };
    const mark = () => { const i = current(); dotBtns.forEach((b, j) => b.setAttribute("aria-current", i === j)); };
    rail.addEventListener("scroll", mark, { passive: true });
    $("railPrev").addEventListener("click", () => go(current() - 1));
    $("railNext").addEventListener("click", () => go(current() + 1));
    mark();
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
    // Keep the exact price until someone moves the slider, so this agrees with the case page.
    let exactPrice = D.price_base;
    price.value = exactPrice;
    price.addEventListener("input", () => (exactPrice = +price.value));
    const money = (p) => `€${Number.isInteger(p) ? p : p.toFixed(2)}`;
    function render() {
      const r = D.buyer[+product.value].rows.find((x) => x.origin === origin.value);
      const i = +year.value;
      const y = D.years[i];
      const mu = Engine.markUp(rules, y);
      const see = r.d * (1 + mu);
      const f = D.factor.law[i];
      const sefa = f * r.bm[i];
      const net = Math.max(0, see - sefa);
      const p = exactPrice;
      $("l_yearOut").textContent = y;
      $("l_priceOut").textContent = money(p);
      const rows = [
        ["Default value for this product and origin", `${r.d.toFixed(3)} t`, "Commission default value file"],
        [`Add the ${y} mark-up of ${pct(mu)}`, `${see.toFixed(3)} t`, "Commission Q&A 4.25"],
        ["CBAM benchmark, Column B", `${r.bm[i].toFixed(3)} t`, "Commission benchmark file"],
        [`CBAM factor for ${y}`, pct(f, 1), "Directive 2003/87/EC, Art. 10a(1a)"],
        ["Free allocation adjustment, benchmark times factor", `${sefa.toFixed(3)} t`, "Reg. 2025/2620 Annex"],
        ["Certificates needed, emissions less adjustment", `${net.toFixed(3)} t`, "Commission Q&A 3.7"],
        ["Certificate price", money(p), "Latest quarterly price unless you move the slider"],
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
    timelineFill();
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
      $("segment").dataset.on = name;
      if (name === "exporter") drawEdges();
      watch();
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
      fillAll();
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
      const W = 720, H = 240, L = 30, R = 104, T = 10, B = 26;
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
        s.append(el("path", { class: "draw", pathLength: 1, fill: "none", stroke: color(k), "stroke-width": 2.4, "stroke-linecap": "round", "stroke-linejoin": "round", d: series.map((r, i) => `${i ? "L" : "M"}${X(i)} ${Y(r[k])}`).join("") }));
        s.append(el("text", { x: W - R + 8, y: ends.find((n) => n.k === k).y + 4 }, LINE_NAMES[k]));
      });
      const cross = el("line", { y1: T, y2: H - B, stroke: "var(--ink-3)", "stroke-width": 1, visibility: "hidden" });
      s.append(cross);
      const hit = el("rect", { x: L, y: T, width: W - L - R, height: H - T - B, fill: "transparent" });
      hit.addEventListener("pointermove", (evt) => {
        const box = s.getBoundingClientRect();
        const px = ((evt.clientX - box.left) / box.width) * W;
        const i = clamp(Math.round(((px - L) / (W - L - R)) * (series.length - 1)), 0, series.length - 1);
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
      add("rnet", 1, `${e.rival.name} certificates`, t(r), "calc", "What the rival's buyer needs per tonne on the rival's default.", "Rival default with mark-up, less free allocation", ["rd", "f"]);
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
        b.addEventListener("click", () => { selected = b.dataset.id; update(); $("map").querySelector(`[data-id="${selected}"]`).focus({ preventScroll: true }); });
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
          s.addEventListener("input", () => { set(x.key, s.value); src.value = s.value; fill(src); });
          ctl.append(s);
        }
      }
      const s = $("infoSlider");
      if (s && document.activeElement !== s) { s.value = place(x.key); fill(s); }
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
        if (n.value) { state.mill = +n.value; c("mill").value = n.value; fill(c("mill")); update(); }
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
    let buyerPrice = D.price_base;
    bc.value = buyerPrice;
    bc.addEventListener("input", () => (buyerPrice = +bc.value));
    function renderBuyer() {
      const b = D.buyer[+bp.value];
      const i = +by.value;
      const p = buyerPrice;
      $("b_yearOut").textContent = D.years[i];
      $("b_priceOut").textContent = `€${Number.isInteger(p) ? p : p.toFixed(2)}`;
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
    const hex = (s) => s.trim().replace("#", "").padEnd(6, "f").match(/../g).map((x) => parseInt(x, 16));
    const lum = (rgb) => { const [r, g, b] = rgb.map((v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
    const css = getComputedStyle($("heat"));
    const a = hex(css.getPropertyValue("--stay"));
    const b = hex(css.getPropertyValue("--panel"));
    const ink = hex("#1d1d1f");
    $("heat").innerHTML = `<thead><tr><th scope="col">Product</th><th scope="col">2025 trade</th>${shownYears.map((y) => `<th scope="col">${y}</th>`).join("")}</tr></thead><tbody>${
      lines.map((l) => `<tr title="${l.label.replace(/"/g, "&quot;")}"><td>${l.name}</td><td>${eur(l.value)}</td>${shownYears.map((y) => {
        // Lighten any mid-tone until its better text colour clears 4.5:1.
        let t = (l.pct[y] / peak) * 0.9 + 0.04;
        let rgb, onWhite, onInk;
        do {
          rgb = a.map((v, i) => Math.round(v * t + b[i] * (1 - t)));
          const L = lum(rgb);
          onWhite = 1.05 / (L + 0.05);
          onInk = (L + 0.05) / (lum(ink) + 0.05);
          t -= 0.02;
        } while (Math.max(onWhite, onInk) < 4.5 && t > 0);
        return `<td class="c" style="background:rgb(${rgb});color:${onWhite > onInk ? "#fff" : "#1d1d1f"}">${pct(l.pct[y])}</td>`;
      }).join("")}</tr>`).join("")}</tbody>`;

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
        const a2 = el("rect", { x: X(i) - w - 1, y: Y(r.bill), width: w, height: Y(0) - Y(r.bill), rx: 4, fill: "var(--stay)" });
        const b2 = el("rect", { x: X(i) + 1, y: Y(r.naive), width: w, height: Math.max(Y(0) - Y(r.naive), 1), rx: 4, fill: "var(--steel)" });
        [a2, b2].forEach((n) => {
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
      s.append(el("rect", { x: X(first) - step / 2, y: T, width: W - R - (X(first) - step / 2), height: H - T - B, fill: "var(--mill)", opacity: 0.1, rx: 8 }));
      s.append(el("text", { x: W - R - 8, y: T + 18, "text-anchor": "end" }, "CBAM in force"));
      for (let v = dn; v <= up; v++) {
        s.append(el("line", { x1: L, x2: W - R, y1: Y(v), y2: Y(v), stroke: v === 0 ? "var(--ink-3)" : "var(--rule)" }));
        s.append(el("text", { x: L - 8, y: Y(v) + 4, "text-anchor": "end" }, v));
      }
      pts.forEach((p, i) => {
        s.append(el("line", { x1: X(i), x2: X(i), y1: Y(p.beta + 1.96 * p.se), y2: Y(p.beta - 1.96 * p.se), stroke: "var(--mill)", "stroke-width": 2, "stroke-linecap": "round" }));
        const dot = el("circle", { cx: X(i), cy: Y(p.beta), r: 5.5, fill: "var(--mill)", stroke: "var(--panel)", "stroke-width": 2 });
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
    timelineFill();
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
  fillAll();
  watch();
  kick();
})();
