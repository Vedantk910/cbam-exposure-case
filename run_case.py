"""One command: every quoted number, the site's data, and the decision page."""
import json
import random
from dataclasses import replace
from pathlib import Path

from data.facts import (ARCHETYPE, ASSUMPTIONS, CBAM_FACTOR_LAW, CBAM_FACTOR_PROPOSAL, EUR_INR, MARKUP,
                        PRICE_2026_Q, PRICE_BASE, SOURCES, USD_PER_EUR, YEARS, assumption)
from data.tables import benchmark_b, default_for
from model import decision as d
from model import exposure as x
from model import trade_effect as te
from model.obligation import certificates, naive_certificates, see_default, sefa_default

ROOT = Path(__file__).parent
TOOL_PRODUCTS = [
    ("731815", "Bolts and screws", "7213"),
    ("731816", "Nuts", "7213"),
    ("721720", "Galvanised wire", "7213"),
    ("732690", "Other steel articles", "7208"),
    ("730890", "Steel structures", "7208"),
    ("730799", "Pipe fittings", "7208"),
]
RIVALS = {"TW": "Taiwan", "VN": "Viet Nam", "KR": "South Korea", "TR": "Türkiye", "CN": "China", "JP": "Japan", "TH": "Thailand"}
ORIGIN_NAMES = {"IN": "India", **RIVALS, "ID": "Indonesia", "MY": "Malaysia", "UA": "Ukraine", "GB": "United Kingdom",
                "BR": "Brazil", "US": "United States"}
DOWNSTREAM = ("7307", "7308", "7309", "7310", "7311", "7318", "7326")
SHORT = {
    "731815": "Bolts and screws", "731816": "Nuts", "732690": "Other steel articles", "730890": "Steel structures",
    "730799": "Pipe fittings", "721720": "Galvanised wire", "730711": "Cast fittings", "732393": "Stainless tableware",
    "730730": "Butt-weld fittings", "730721": "Flanges", "730722": "Threaded elbows", "730729": "Stainless fittings",
    "730619": "Line pipe, welded", "730411": "Seamless stainless line pipe", "720851": "Hot-rolled plate",
    "721049": "Galvanised sheet", "721935": "Thin cold-rolled stainless", "721934": "Cold-rolled stainless",
    "721933": "Cold-rolled stainless", "722220": "Stainless bars", "720449": "Scrap", "721590": "Other bars",
    "722300": "Stainless wire", "722830": "Alloy bars", "761699": "Aluminium articles", "760612": "Aluminium sheet",
    "760120": "Aluminium alloy, unwrought", "760110": "Aluminium, unwrought", "760429": "Aluminium profiles",
    "760421": "Aluminium hollow profiles", "720712": "Slab", "720110": "Pig iron", "730421": "Drill pipe",
    "721430": "Free-cutting bars", "721391": "Wire rod", "721399": "Wire rod", "730630": "Welded tube",
    "730690": "Other welded tube", "730640": "Stainless welded tube", "730661": "Hollow sections",
    "730711": "Cast fittings", "721012": "Tinplate", "720839": "Hot-rolled coil", "720838": "Hot-rolled coil",
    "720837": "Hot-rolled coil", "721049": "Galvanised sheet", "722519": "Electrical steel", "721012": "Tinplate",
    "730441": "Stainless cold-drawn tube", "721070": "Painted or coated sheet", "720690": "Primary-form steel",
    "720917": "Cold-rolled sheet", "720916": "Cold-rolled sheet", "730449": "Stainless tube", "730419": "Line pipe, seamless",
}


def finite(v):
    """JSON has no Infinity; a flip that is never reached becomes null."""
    if isinstance(v, dict):
        return {k: finite(i) for k, i in v.items()}
    if isinstance(v, list):
        return [finite(i) for i in v]
    return None if isinstance(v, float) and v == float("inf") else v


def short_name(hs6):
    return SHORT.get(hs6, f"HS {hs6}")


def headline():
    default, route = default_for("IN", ARCHETYPE["hs6"])
    bm = benchmark_b(ARCHETYPE["hs6"], route, 2026)
    uv = unit_value("IN", ARCHETYPE["hs6"])
    rows = []
    for y in YEARS:
        see = see_default(default, y)
        sefa = sefa_default(bm, y)
        net = certificates(see, sefa)
        naive = naive_certificates(see, y)
        rows.append({"year": y, "see": see, "sefa": sefa, "net": net, "naive": naive,
                     "cost": net * PRICE_BASE, "naive_cost": naive * PRICE_BASE, "pct_value": net * PRICE_BASE / uv})
    return {"default": default, "benchmark": bm, "unit_value": uv, "rows": rows,
            "ratio_2026": rows[0]["net"] / rows[0]["naive"], "payable_share_2026": rows[0]["net"] / rows[0]["see"],
            "benchmark_multiple": rows[0]["see"] / bm}


def unit_value(origin, hs6, base=None):
    base = x.totals() if base is None else base
    v, t = base.get((origin, hs6), (0.0, 0.0))
    return v / t if t else 0.0


def positions(e, schedule=CBAM_FACTOR_LAW):
    return {y: d.certs(e, y, schedule) for y in YEARS}


def stress(e):
    """G4: push each input and record whether the answer moves."""
    def run(label, **change):
        price = change.pop("price", PRICE_BASE)
        schedule = change.pop("schedule", CBAM_FACTOR_LAW)
        start = change.pop("start", None)
        rate = change.pop("rate", None)
        v = replace(e, **change)
        best, pv = d.recommend(v, price=price, schedule=schedule, start=start, rate=rate)
        return {"case": label, "answer": best, "stay": pv["stay"], "mill": pv["mill"], "divert": pv["divert"],
                "flip_tonnes": d.flip_tonnes_pv(v, "mill", price=price, schedule=schedule, start=start, rate=rate)}

    return [
        run("Base case"),
        run("Carbon price EUR 40", price=40.0), run("Carbon price EUR 120", price=120.0),
        run("Carbon price EUR 150", price=150.0),
        run("COM(2026) 616 slower phase-out", schedule=CBAM_FACTOR_PROPOSAL),
        run("Verified rod at 3.5 tCO2e/t", s_mill=3.5), run("Verified rod at 4.5 tCO2e/t", s_mill=4.5),
        run("Verified rod at 5.5 tCO2e/t", s_mill=5.5),
        run("Verification costs three times more", verify_cost=e.verify_cost * 3),
        run("Own process twice as dirty", own=e.own * 2),
        run("Yield worse: 1.20 t steel per t bolts", mass_ratio=1.2),
        run("Discount rate 20%", rate=0.20),
        run("First verified year slips to 2029", start=2029),
        run("Rival is Viet Nam", rival="VN"), run("Rival is South Korea", rival="KR"),
        run("Rival is Türkiye", rival="TR"), run("Rival is China", rival="CN"),
        run("50 t per year exporter", tonnes=50.0), run("100 t per year exporter", tonnes=100.0),
        run("5,000 t per year exporter", tonnes=5000.0),
    ]


def ablations(e):
    """Remove one piece of the formula and see what it was worth, in 2027 EUR/t."""
    y = 2027
    base = d.certs(e, y)
    gone_fa = d.certs(e, y, {k: 0.0 for k in YEARS})
    no_markup = certificates(e.default, sefa_default(e.bm_b, y))
    tw = default_for("TW", e.hs6)[0]
    at_taiwan_default = certificates(see_default(tw, y), sefa_default(e.bm_b, y))
    return {
        "stay_eur_t": base["stay"] * PRICE_BASE,
        "without_free_allocation": gone_fa["stay"] * PRICE_BASE,
        "without_mark_up": no_markup * PRICE_BASE,
        "if_india_had_taiwan_default": at_taiwan_default * PRICE_BASE,
        "mill_eur_t": base["mill"] * PRICE_BASE,
        "green_gap_without_route_benchmark": (see_gap(e)) * PRICE_BASE,
        "green_gap_actual": (base["mill"] - base["green"]) * PRICE_BASE,
    }


def see_gap(e):
    return e.mass_ratio * (e.s_mill - e.s_low)


def sector(base):
    by_year = []
    for y in YEARS:
        b = x.origin_bill("IN", y, base)
        naive = sum(naive_certificates(see_default(default_for("IN", h)[0], y), y) * PRICE_BASE * v[1]
                    for (o, h), v in base.items() if o == "IN" and default_for("IN", h))
        p = x.origin_bill("IN", y, base, schedule=CBAM_FACTOR_PROPOSAL)
        by_year.append({"year": y, "bill": b["bill"], "naive": naive, "pct": b["pct"], "proposal": p["bill"]})
    total = x.origin_bill("IN", 2026, base)
    lines = []
    for (o, h), (v, t) in base.items():
        if o == "IN" and x.in_scope(h) and t >= 500:
            uv = v / t
            lines.append({
                "hs6": h, "name": short_name(h), "label": label(h), "tonnes": t, "value": v, "uv": uv,
                "downstream": h[:4] in DOWNSTREAM, "aluminium": h.startswith("76"),
                "pct": {y: x.cost_per_tonne("IN", h, y) / uv for y in YEARS},
            })
    lines.sort(key=lambda r: -r["value"])
    downstream = sum(r["value"] for r in lines if r["downstream"])
    return {"by_year": by_year, "scope_value": total["value"], "scope_tonnes": total["tonnes"],
            "top_lines": lines[:14], "lines_counted": len(lines),
            "downstream_share": downstream / sum(r["value"] for r in lines)}


def label(hs6, _cache={}):
    if not _cache:
        import csv
        with (ROOT / "data/raw/hs6_labels.csv").open() as f:
            _cache.update({r["hs6"]: r["label"] for r in csv.DictReader(f)})
    return _cache.get(hs6, "")


def origins(hs6, base, year=2027):
    rows = []
    for o, name in ORIGIN_NAMES.items():
        row = default_for(o, hs6)
        t = base.get((o, hs6), (0, 0))[1]
        if row:
            rows.append({"origin": o, "name": name, "default": row[0], "route": row[1],
                         "cost": x.cost_per_tonne(o, hs6, year), "tonnes": t})
    return sorted(rows, key=lambda r: -r["cost"])


def trade_summary():
    months = te.months_available()
    last = months[-1]
    same = [m[5:] for m in months if m.startswith("2026")]
    is_down = lambda h: h[:4] in DOWNSTREAM
    table = []
    for o in ("IN", "TR", "CN", "VN", "KR", "TW"):
        table.append({"origin": o, "name": ORIGIN_NAMES[o],
                      "all_scope": te.ytd_change(o, None, same),
                      "downstream": te.ytd_change(o, is_down, same)})
    return {"last_month": last, "months_2026": len(same), "ytd": table, "estimates": te.estimates(),
            "event_study": te.event_study(), "event_study_origin_month": te.event_study(True)}


def exporter_payload(hs6, name, precursor):
    e = d.exporter_for(hs6, precursor)
    rivals = {}
    for o, n in RIVALS.items():
        row = default_for(o, hs6)
        rivals[o] = {"name": n, "d": row[0], "bm": [benchmark_b(hs6, row[1], y) for y in YEARS]}
    return {"hs6": hs6, "name": name, "precursor": precursor, "default": e.default,
            "default_precursor": e.default_precursor, "bm_b": e.bm_b, "bm_a": e.bm_a,
            "bm_precursor": e.bm_precursor, "bm_precursor_low": e.bm_precursor_low,
            "uv": unit_value("IN", hs6), "rivals": rivals}


def pins():
    """Scenarios the JS engine must reproduce; site/verify.js fails on any drift."""
    rng = random.Random(910)
    out = []
    for _ in range(60):
        hs6, _, precursor = rng.choice(TOOL_PRODUCTS)
        e = replace(d.exporter_for(hs6, precursor),
                    tonnes=rng.choice([40.0, 120.0, 600.0, 2500.0]), own=rng.uniform(0.1, 1.2),
                    mass_ratio=rng.uniform(1.0, 1.3), s_mill=rng.uniform(1.5, 5.5), s_low=rng.uniform(0.5, 2.0),
                    verify_cost=rng.uniform(5000, 60000), green_premium=rng.uniform(0, 300),
                    rival=rng.choice(list(RIVALS)), price_loss_divert=rng.uniform(50, 600))
        price = rng.uniform(40, 160)
        rate = rng.uniform(0.05, 0.2)
        law = rng.random() < 0.5
        sched = CBAM_FACTOR_LAW if law else CBAM_FACTOR_PROPOSAL
        best, pv = d.recommend(e, price=price, schedule=sched, rate=rate)
        out.append({
            "hs6": hs6, "tonnes": e.tonnes, "own": e.own, "mass_ratio": e.mass_ratio, "s_mill": e.s_mill,
            "s_low": e.s_low, "verify_cost": e.verify_cost, "green_premium": e.green_premium, "rival": e.rival,
            "price_loss_divert": e.price_loss_divert, "price": price, "rate": rate,
            "schedule": "law" if law else "proposal",
            "expect": {"best": best, "pv": pv, "flip_tonnes": d.flip_tonnes_pv(e, "mill", price=price, schedule=sched, rate=rate),
                       "flip_premium_2034": d.flip_premium(e, 2034, price, sched),
                       "flip_mill": d.flip_mill_intensity(e, price, sched, rate)},
        })
    return out


def money(v):
    a = abs(v)
    sign = "-" if v < 0 else ""
    if a >= 1e9:
        return f"{sign}EUR {a / 1e9:.2f}bn"
    if a >= 1e6:
        return f"{sign}EUR {a / 1e6:.2f}M"
    if a >= 1e4:
        return f"{sign}EUR {a / 1e3:.0f}k"
    return f"{sign}EUR {a:,.0f}"


def decision_page(n):
    h, f, pv, ab, s = n["headline"], n["flips"], n["pv"], n["ablations"], n["sector"]
    r26, r27, r34 = h["rows"][0], h["rows"][1], h["rows"][-1]
    t = n["trade"]
    e = t["estimates"]
    g = n["markets"]
    world = n["world_kt_bolts"]
    route_take = 1 - ab["green_gap_actual"] / ab["green_gap_without_route_benchmark"]
    return f"""# Decision page: CBAM Exposure Case

**Question.** A {n["archetype"]["tonnes"]:.0f} t/yr Indian fastener maker asks what to do about CBAM before 2034.

**Answer.** Buy verified rod from your current mill and verify your own plant. Do not wait, do not buy green steel yet, and do not leave the EU.

| Position | Present-value hit, 2027-34 |
|---|---|
| Verified rod, current mill | {money(pv["mill"])} |
| Low-carbon rod | {money(pv["green"])} |
| Verify own plant only | {money(pv["verify"])} |
| Stay on defaults | {money(pv["stay"])} |
| Sell outside the EU | {money(pv["divert"])} |

Hit is what the exporter absorbs after a Taiwanese rival's own default-route bill, plus fixed costs, at a flat EUR {n["generated_from"]["price_base"]}/t and 12%.

## Why

1. **The bill is real now.** The "2.5% in 2026" shorthand holds only at the benchmark. Certificates are `embedded emissions - free allocation`, and free allocation is a benchmark amount. India's marked-up default for bolts is {h["benchmark_multiple"]:.1f}x that benchmark, so {h["payable_share_2026"]:.0%} of embedded emissions is charged in 2026, not 2.5%. That is {r26["net"]:.2f} certificates a tonne against {r26["naive"]:.2f}, a factor of {h["ratio_2026"]:.0f}.
2. **The cost is large against the price.** On defaults, a tonne of bolts carries {money(r27["cost"])} in 2027 ({r27["pct_value"]:.0%} of the 2025 EU import price), rising to {money(r34["cost"])} by 2034 ({r34["pct_value"]:.0%}).
3. **The money is in the rod.** Verifying the plant alone saves {money(n["saving_stay_to_verify_pv"])}. Adding verified rod saves {money(n["saving_stay_to_mill_pv"])}. {n["share_of_prize_from_rod"]:.0%} of the prize comes from the mill's report.
4. **Green steel loses for now.** Free allocation falls with the cleaner route, which takes back {route_take:.0%} of the gain in 2027.

## Triggers

- Verified rod beats defaults above **{f["tonnes_mill_pv"]:.0f} t/yr** of EU sales. Verifying the plant alone needs {f["tonnes_verify_pv"]:.0f} t/yr.
- Any verified rod below **{f["intensity_2028"]:.2f} tCO2e/t** beats the marked-up default from 2028.
- Low-carbon rod beats verified rod if the mill is above **{f["mill_vs_green"]:.1f} tCO2e/t**, or if carbon passes **EUR {f["carbon_price_2034"]:.0f}/t** in 2034 at a EUR {n["archetype_premium"]:.0f}/t premium.

## Sector

India's in-scope exports to the EU were {money(s["scope_value"])} in 2025 ({s["scope_tonnes"] / 1e6:.2f} Mt). On defaults that is {money(s["by_year"][0]["bill"])} in 2026, {s["by_year"][0]["pct"]:.0%} of value, against EUR {s["by_year"][0]["naive"] / 1e6:.0f}M on the shorthand. Outside estimates are lower: FEPS-NIPFP 16% of 2022 unit value, Sentra.world 10-20% of product cost. Commodity grades carry the most, at up to {max(r["pct"]["2026"] if "2026" in r["pct"] else r["pct"][2026] for r in s["top_lines"]):.0%} of value in 2026.

## Diverting

The EU took {g["EU27"]["kt"] / world:.0%} of India's 2025 bolt tonnes. Rest-of-world prices are about {money(n["divert_price_loss"])}/t lower. One firm can move. The sector cannot, with the US under Section 232 and the UK starting its own CBAM in January 2027.

## Trade so far

Through {t["last_month"]}, the average effect of the default burden on EU imports is not distinguishable from zero (beta {e["base"]["beta"]:.2f}, se {e["base"]["se"]:.2f}; placebo t {e["placebo_2025"]["t"]:.1f}). A stricter version gives {e["with_origin_month"]["beta"]:.2f} (t {e["with_origin_month"]["t"]:.1f}), but its pre-2026 points are not flat, so it is not relied on. Certificates are not on sale until February 2027.

## Honest limits

- No exporter, mill or verifier was interviewed. The exporter is fictional.
- No Indian mill's verified figure is public. 2.6 tCO2e/t is an estimate and the largest risk.
- Verification cost is a press figure at its upper end. Treble it and the trigger is {next(r["flip_tonnes"] for r in n["stress"] if r["case"].startswith("Verification")):.0f} t/yr.
- Coverage of 7318 and 7326 by the steel quotas is inferred; Annex I of Reg. 2026/1384 was not read.
- Carbon is flat at the latest quarterly price, not a forecast.
"""


def main():
    base = x.totals()
    e = d.archetype()
    best, pv = d.recommend(e)
    pv_gross = d.present_hit(replace(e, rival="OTHER"))
    flips = {
        "tonnes_mill_pv": d.flip_tonnes_pv(e, "mill"), "tonnes_verify_pv": d.flip_tonnes_pv(e, "verify"),
        "tonnes_mill_2027": d.flip_tonnes(e, 2027, "mill"), "premium": {y: d.flip_premium(e, y) for y in YEARS},
        "carbon_price_2034": d.flip_carbon_price(e, 2034), "carbon_price_2030": d.flip_carbon_price(e, 2030),
        "intensity_2028": d.flip_intensity(e, 2028), "mill_vs_green": d.flip_mill_intensity(e),
    }
    pos = positions(e)
    y0 = 2027
    numbers = {
        "archetype_premium": e.green_premium,
        "generated_from": {"eurostat_last_month": te.months_available()[-1], "price_base": PRICE_BASE,
                           "price_2026_q": PRICE_2026_Q, "eur_inr": EUR_INR, "usd_per_eur": USD_PER_EUR},
        "headline": headline(),
        "archetype": {"own_process": e.own, "mass_ratio": e.mass_ratio, "default": e.default,
                      "precursor_default": e.default_precursor, "tonnes": e.tonnes, "rival": e.rival,
                      "precursor_share_2027": e.mass_ratio * see_default(e.default_precursor, y0) /
                      (e.own + e.mass_ratio * see_default(e.default_precursor, y0))},
        "positions": pos,
        "pv": pv, "best": best,
        "saving_stay_to_mill_pv": pv["stay"] - pv["mill"],
        "saving_stay_to_verify_pv": pv["stay"] - pv["verify"],
        "annual_2027": d.annual_hit(e, y0),
        "share_of_prize_from_rod": 1 - (pos[y0]["stay"] - pos[y0]["verify"]) / (pos[y0]["stay"] - pos[y0]["mill"]),
        "flips": flips,
        "sector": sector(base),
        "origins_bolts": origins("731815", base),
        "origins_rod": origins("721391", base),
        "markets": x.fob_markets(),
        "world_kt_bolts": x.world_kt(),
        "divert_price_loss": e.price_loss_divert,
        "suppliers_bolts": x_suppliers(base),
        "stress": stress(e),
        "ablations": ablations(e),
        "trade": trade_summary(),
    }
    (ROOT / "out").mkdir(exist_ok=True)
    (ROOT / "out/decision_numbers.json").write_text(json.dumps(finite(numbers), indent=1))
    (ROOT / "report/decision_page.md").write_text(decision_page(json.loads(json.dumps(finite(numbers)))))

    site = {
        "years": YEARS, "factor": {"law": list(CBAM_FACTOR_LAW.values()), "proposal": list(CBAM_FACTOR_PROPOSAL.values())},
        "markup": MARKUP, "cscf": 1.0, "price_base": PRICE_BASE,
        "products": [exporter_payload(*p) for p in TOOL_PRODUCTS],
        "defaults": {"tonnes": e.tonnes, "own": e.own, "mass_ratio": e.mass_ratio, "s_mill": e.s_mill, "s_low": e.s_low,
                     "verify_cost": e.verify_cost, "green_premium": e.green_premium,
                     "discount_rate": assumption("discount_rate"), "first_verified_year": assumption("first_verified_year"),
                     "price_loss_divert": e.price_loss_divert, "rival": e.rival},
        "numbers": {k: numbers[k] for k in ("headline", "pv", "best", "flips", "sector", "origins_bolts", "markets", "world_kt_bolts",
                                            "stress", "trade", "archetype", "ablations", "share_of_prize_from_rod",
                                            "divert_price_loss", "saving_stay_to_mill_pv", "annual_2027", "positions")},
        "sources": [{"id": k, "title": v[0], "tag": v[1], "url": v[2]} for k, v in SOURCES.items()],
        "assumptions": [{"key": k, "value": v[0], "name": v[1], "unit": v[2], "why": v[3], "source": v[4]}
                        for k, v in ASSUMPTIONS.items()],
        "work": {"sources": len(SOURCES), "trade_rows": len(x.trade()), "origins": len(ORIGIN_NAMES),
                 "default_rows": sum(1 for _ in (ROOT / "data/raw/defaults_official.csv").open()) - 1,
                 "benchmark_rows": sum(1 for _ in (ROOT / "data/raw/benchmarks_official.csv").open()) - 1,
                 "tests": sum(p.read_text().count("def test_") for p in (ROOT / "tests").glob("test_*.py")),
                 "stress_cases": len(numbers["stress"])},
        "pins": pins(),
    }
    (ROOT / "site/data.json").write_text(json.dumps(finite(site), separators=(",", ":")))
    print(json.dumps({k: numbers[k] for k in ("pv", "best", "flips", "share_of_prize_from_rod")}, indent=1)[:1800])
    return numbers


def x_suppliers(base):
    rows = sorted(((v[1], o) for (o, h), v in base.items() if h == "731815"), reverse=True)
    return [{"origin": o, "name": ORIGIN_NAMES.get(o, o), "tonnes": t} for t, o in rows]


if __name__ == "__main__":
    main()
