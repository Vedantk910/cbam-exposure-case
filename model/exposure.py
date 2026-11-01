"""Sector view: what the default route costs each origin, product by product."""
import csv
from collections import defaultdict
from functools import lru_cache
from pathlib import Path

from data.facts import CBAM_FACTOR_LAW, PRICE_BASE, USD_PER_EUR
from data.tables import benchmark_b, default_for
from model.obligation import certificates, see_default, sefa_default

RAW = Path(__file__).parent.parent / "data/raw"
EU27 = {40, 56, 100, 191, 196, 203, 208, 233, 246, 251, 276, 300, 348, 372, 380, 428, 440, 442,
        470, 528, 616, 620, 642, 703, 705, 724, 752}
US, UK = 842, 826
OUTLIER_USD_KG = 4.0  # Comtrade unit values above this are specialty or mis-weighed lots


@lru_cache
def trade():
    with (RAW / "trade_hs6_monthly.csv").open() as f:
        return [(r["month"], r["origin"], r["hs6"], float(r["value_eur"]), float(r["tonnes"]))
                for r in csv.DictReader(f)]


def in_scope(hs6):
    return default_for("OTHER", hs6) is not None or default_for("IN", hs6) is not None


def totals(prefix="2025", months=None):
    """{(origin, hs6): [value, tonnes]} for a period."""
    out = defaultdict(lambda: [0.0, 0.0])
    for month, origin, hs6, value, tonnes in trade():
        if month.startswith(prefix) and (months is None or month[5:] in months):
            out[origin, hs6][0] += value
            out[origin, hs6][1] += tonnes
    return out


def net_certificates(origin, hs6, year, schedule=CBAM_FACTOR_LAW):
    row = default_for(origin, hs6)
    if row is None:
        return 0.0
    default, route = row
    return certificates(see_default(default, year), sefa_default(benchmark_b(hs6, route, year), year, schedule))


def cost_per_tonne(origin, hs6, year, price=PRICE_BASE, schedule=CBAM_FACTOR_LAW):
    return net_certificates(origin, hs6, year, schedule) * price


def origin_bill(origin, year, base=None, price=PRICE_BASE, schedule=CBAM_FACTOR_LAW):
    """EUR bill and scope value at 2025 volumes on default values, ignoring the 50 t exemption."""
    base = totals() if base is None else base
    bill = value = tonnes = 0.0
    for (o, hs6), (v, t) in base.items():
        if o == origin and in_scope(hs6):
            bill += cost_per_tonne(o, hs6, year, price, schedule) * t
            value += v
            tonnes += t
    return {"bill": bill, "value": value, "tonnes": tonnes, "pct": bill / value if value else 0.0}


def fob_markets():
    """India's 2025 fastener exports by destination group: [kt, USD m, USD/kg]."""
    groups = defaultdict(lambda: [0.0, 0.0])
    with (RAW / "india_exports_731815.csv").open() as f:
        for r in csv.DictReader(f):
            kg, usd = float(r["kg"] or 0), float(r["fob_usd"] or 0)
            p = int(r["partner_code"])
            if r["year"] != "2025" or p == 0 or kg <= 0:
                continue
            if p in EU27:
                name = "EU27"
            elif p == US:
                name = "US"
            elif p == UK:
                name = "UK"
            elif usd / kg < OUTLIER_USD_KG:
                name = "Rest of world"
            else:
                continue
            groups[name][0] += kg
            groups[name][1] += usd
    return {k: {"kt": v[0] / 1e6, "usd_m": v[1] / 1e6, "usd_kg": v[1] / v[0]} for k, v in groups.items()}


def world_kt():
    """India's total 2025 fastener exports, from Comtrade's own world row."""
    with (RAW / "india_exports_731815.csv").open() as f:
        return next(float(r["kg"]) / 1e6 for r in csv.DictReader(f)
                    if r["year"] == "2025" and r["partner_code"] == "0")


def divert_price_loss():
    """EUR per tonne given up by selling at the rest-of-world price instead of the EU price."""
    m = fob_markets()
    return (m["EU27"]["usd_kg"] - m["Rest of world"]["usd_kg"]) * 1000 / USD_PER_EUR
