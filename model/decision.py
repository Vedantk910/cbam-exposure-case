"""Five positions for one exporter, priced on one yardstick, with closed-form flips.

The yardstick is the exporter's hit. The importer pays CBAM, but a buyer will only pay
what the marginal rival's landed cost allows. So the EU price can rise by the rival's own
CBAM bill, and the exporter absorbs the rest:

    hit = (own certificates - rival certificates) x price x tonnes + fixed costs

The rival term cancels in every comparison between positions that stay in the EU, so the
flips below do not depend on who the rival is. It only matters against diverting.
"""
from dataclasses import dataclass, replace

from data.facts import ARCHETYPE, CBAM_FACTOR_LAW, FUEL, PRICE_BASE, SENSITIVITY, YEARS, assumption
from data.tables import benchmark_a, benchmark_b, default_for
from model.exposure import divert_price_loss, net_certificates
from model.obligation import (certificates, see_actual, see_default, sefa_actual, sefa_default)


def own_process_intensity(a=ARCHETYPE):
    """tCO2 per tonne of good from fuels inside the boundary, by the 2025/2547 method."""
    fo = a["furnace_oil_t"] * FUEL["furnace_oil"][0] * FUEL["furnace_oil"][1]
    lpg = a["lpg_t"] * FUEL["lpg"][0] * FUEL["lpg"][1]
    return (fo + lpg) / a["tonnes"]


@dataclass
class Exporter:
    hs6: str
    default: float
    default_precursor: float
    bm_b: float
    bm_a: float
    bm_precursor: float
    bm_precursor_low: float
    tonnes: float = ARCHETYPE["tonnes"]
    own: float = own_process_intensity()
    mass_ratio: float = ARCHETYPE["precursor_tonnes"] / ARCHETYPE["tonnes"]
    s_mill: float = assumption("s_mill")
    s_low: float = assumption("s_low")
    verify_cost: float = assumption("verify_cost_eur")
    green_premium: float = assumption("green_premium_eur")
    price_loss_divert: float = 0.0
    rival: str = "TW"


def exporter_for(hs6, precursor):
    d, route = default_for("IN", hs6)
    d_precursor, _ = default_for("IN", precursor)
    return Exporter(hs6=hs6, default=d, default_precursor=d_precursor,
                    bm_b=benchmark_b(hs6, route, 2026), bm_a=benchmark_a(hs6),
                    bm_precursor=benchmark_b(precursor, "(C)", 2026),
                    bm_precursor_low=benchmark_b(precursor, "(E)", 2026),
                    price_loss_divert=divert_price_loss())


def archetype():
    return exporter_for(ARCHETYPE["hs6"], ARCHETYPE["precursor"])


def certs(e, year, schedule=CBAM_FACTOR_LAW):
    """Certificates per tonne of good under each position that stays in the EU."""
    act = sefa_actual(e.bm_a, e.mass_ratio, e.bm_precursor, year, schedule)
    act_low = sefa_actual(e.bm_a, e.mass_ratio, e.bm_precursor_low, year, schedule)
    return {
        "stay": certificates(see_default(e.default, year), sefa_default(e.bm_b, year, schedule)),
        # Q&A 4.25: a default precursor inside an actual calculation carries the mark-up.
        "verify": certificates(see_actual(e.own, e.mass_ratio, see_default(e.default_precursor, year)), act),
        "mill": certificates(see_actual(e.own, e.mass_ratio, e.s_mill), act),
        "green": certificates(see_actual(e.own, e.mass_ratio, e.s_low), act_low),
    }


def annual_hit(e, year, price=PRICE_BASE, schedule=CBAM_FACTOR_LAW):
    c = certs(e, year, schedule)
    t = e.tonnes
    rival = net_certificates(e.rival, e.hs6, year, schedule)
    absorbed = {k: (v - rival) * price * t for k, v in c.items()}
    return {
        "stay": absorbed["stay"],
        "verify": absorbed["verify"] + e.verify_cost,
        "mill": absorbed["mill"] + e.verify_cost,
        "green": absorbed["green"] + e.verify_cost + e.green_premium * e.mass_ratio * t,
        "divert": e.price_loss_divert * t,
    }


def present_hit(e, price=PRICE_BASE, schedule=CBAM_FACTOR_LAW, rate=None, start=None):
    rate = assumption("discount_rate") if rate is None else rate
    start = assumption("first_verified_year") if start is None else start
    total = {k: 0.0 for k in ("stay", "verify", "mill", "green", "divert")}
    for y in YEARS:
        if y < start:
            continue
        for k, v in annual_hit(e, y, price, schedule).items():
            total[k] += v / (1 + rate) ** (y - start)
    return total


def recommend(e, **kw):
    pv = present_hit(e, **kw)
    return min(pv, key=pv.get), pv


def flip_tonnes(e, year, option="mill", price=PRICE_BASE, schedule=CBAM_FACTOR_LAW):
    """Annual EU tonnes above which the option beats staying on defaults."""
    c = certs(e, year, schedule)
    saving = (c["stay"] - c[option]) * price
    return e.verify_cost / saving if saving > 0 else float("inf")


def flip_tonnes_pv(e, option="mill", price=PRICE_BASE, schedule=CBAM_FACTOR_LAW, rate=None, start=None):
    """Same trigger over the whole horizon. Tonnes cancel, so this is closed form."""
    rate = assumption("discount_rate") if rate is None else rate
    start = assumption("first_verified_year") if start is None else start
    cost = saving = 0.0
    for y in YEARS:
        if y < start:
            continue
        d = (1 + rate) ** (y - start)
        c = certs(e, year=y, schedule=schedule)
        cost += e.verify_cost / d
        saving += (c["stay"] - c[option]) * price / d
    return cost / saving if saving > 0 else float("inf")


def flip_premium(e, year, price=PRICE_BASE, schedule=CBAM_FACTOR_LAW):
    """EUR/t of steel at which low-carbon rod stops paying against verified current rod."""
    c = certs(e, year, schedule)
    return (c["mill"] - c["green"]) * price / e.mass_ratio


def flip_carbon_price(e, year, schedule=CBAM_FACTOR_LAW):
    """EUR/tCO2 at which low-carbon rod pays at the assumed premium."""
    c = certs(e, year, schedule)
    gap = c["mill"] - c["green"]
    return e.green_premium * e.mass_ratio / gap if gap > 0 else float("inf")


def flip_mill_intensity(e, price=PRICE_BASE, schedule=CBAM_FACTOR_LAW, rate=None, start=None):
    """Verified rod above this loses to low-carbon rod. Hit is linear in rod intensity."""
    rate = assumption("discount_rate") if rate is None else rate
    start = assumption("first_verified_year") if start is None else start
    pv = present_hit(e, price, schedule, rate, start)
    weight = sum(1 / (1 + rate) ** (y - start) for y in YEARS if y >= start)
    return e.s_mill + (pv["green"] - pv["mill"]) / (weight * e.mass_ratio * price * e.tonnes)


def sensitivity(e, price=PRICE_BASE, schedule=CBAM_FACTOR_LAW, rate=None, start=None):
    """How far each input moves the value of verified rod over staying on defaults."""
    rate = assumption("discount_rate") if rate is None else rate
    start = assumption("first_verified_year") if start is None else start

    def run(key, value):
        kw = {"price": price, "rate": rate}
        if key in kw:
            kw[key] = value
            v = e
        else:
            v = replace(e, **{key: value})
        best, pv = recommend(v, schedule=schedule, start=start, **kw)
        return pv["stay"] - pv["mill"], best

    rows = []
    for key, label, low, high in SENSITIVITY:
        lo, best_lo = run(key, low)
        hi, best_hi = run(key, high)
        rows.append({"key": key, "label": label, "low": low, "high": high, "at_low": lo, "at_high": hi,
                     "best_low": best_lo, "best_high": best_hi})
    return sorted(rows, key=lambda r: -abs(r["at_high"] - r["at_low"]))


def flip_intensity(e, year):
    """Any verified rod below this beats the default: the marked-up default itself."""
    return see_default(e.default_precursor, year)
