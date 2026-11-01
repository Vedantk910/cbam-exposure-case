"""The EU buyer's side: which origin is cheapest once CBAM is in the landed price."""
from data.facts import CBAM_FACTOR_LAW, PRICE_BASE
from model.exposure import cost_per_tonne, totals

MIN_TONNES = 2000  # below this a unit value is too thin to compare


def suppliers(hs6, base=None):
    """Origins with real volume in 2025: {origin: (unit value, tonnes)}."""
    base = totals() if base is None else base
    return {o: (v / t, t) for (o, h), (v, t) in base.items() if h == hs6 and t >= MIN_TONNES and v > 0}


def landed(hs6, year, price=PRICE_BASE, schedule=CBAM_FACTOR_LAW, base=None):
    """Origins from cheapest to dearest. Default values, before customs duty."""
    rows = [{"origin": o, "price": uv, "cbam": cost_per_tonne(o, hs6, year, price, schedule), "tonnes": t}
            for o, (uv, t) in suppliers(hs6, base).items()]
    for r in rows:
        r["landed"] = r["price"] + r["cbam"]
    return sorted(rows, key=lambda r: r["landed"])


def rank_shift(hs6, origin="IN", year=2026, price=PRICE_BASE, base=None):
    """Where one origin sits by import price alone, and again with CBAM added."""
    rows = landed(hs6, year, price, base=base)
    before = sorted(rows, key=lambda r: r["price"])
    place = lambda order: next(i for i, r in enumerate(order, 1) if r["origin"] == origin)
    return {"before": place(before), "after": place(rows), "of": len(rows)}


def gap_to(hs6, rival, origin="IN", year=2026, price=PRICE_BASE, base=None):
    """(rival price minus origin price) before and after CBAM, EUR/t."""
    r = {x["origin"]: x for x in landed(hs6, year, price, base=base)}
    return r[rival]["price"] - r[origin]["price"], r[rival]["landed"] - r[origin]["landed"]
