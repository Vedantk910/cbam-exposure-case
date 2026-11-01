"""Has the default gap moved trade yet? A dose-response panel on EU imports.

log(tonnes) = origin-product FE + product-month FE + beta x (burden x post)

burden is the 2026 default cost as a share of the 2023 unit value. It uses 2023 on purpose:
a 2025 base would tie burden to the outcome, since low 2025 prices and high 2025 tonnes
move together. Product-month effects absorb anything that hits a product from every
origin, including the steel quotas.
"""
from collections import defaultdict

import numpy as np

from data.facts import PRICE_BASE
from model.exposure import cost_per_tonne, in_scope, totals, trade

POST = "2026-01"


def burdens():
    base = totals("2023")
    out = {}
    for (origin, hs6), (value, tonnes) in base.items():
        if tonnes > 0 and value > 0:
            uv = value / tonnes
            out[origin, hs6] = cost_per_tonne(origin, hs6, 2026, PRICE_BASE) / uv if in_scope(hs6) else 0.0
    return out


def absorb(arrays, groups, tol=1e-8, max_iter=500):
    """Alternating projections: subtract each group's mean until nothing moves."""
    arrays = [a.astype(float).copy() for a in arrays]
    for k, a in enumerate(arrays):
        for _ in range(max_iter):
            before = a.copy()
            for g, n in groups:
                a -= (np.bincount(g, a, minlength=len(n)) / n)[g]
            if np.abs(a - before).max() < tol:
                break
        arrays[k] = a
    return arrays


def fit_many(y, xs, groups, cluster):
    """OLS after absorbing fixed effects, standard errors clustered on origin-product."""
    def codes(g):
        _, inv, cnt = np.unique(g, return_inverse=True, return_counts=True)
        return inv, cnt

    enc = [codes(g) for g in groups]
    yd, *xd = absorb([y, *xs], enc)
    X = np.column_stack(xd)
    bread = np.linalg.inv(X.T @ X)
    beta = bread @ (X.T @ yd)
    u = yd - X @ beta
    _, cl = np.unique(cluster, return_inverse=True)
    scores = np.column_stack([np.bincount(cl, X[:, j] * u) for j in range(X.shape[1])])
    g = scores.shape[0]
    cov = g / (g - 1) * bread @ (scores.T @ scores) @ bread
    return beta, np.sqrt(np.diag(cov)), int(y.size), int(g)


def fit(y, x, groups, cluster):
    beta, se, n, g = fit_many(y, [x], groups, cluster)
    return {"beta": float(beta[0]), "se": float(se[0]), "t": float(beta[0] / se[0]), "n": n, "clusters": g}


def panel(last_month=None, post=POST):
    b = burdens()
    rows = [(m, o, h, t) for m, o, h, _, t in trade()
            if t > 0 and (o, h) in b and (last_month is None or m <= last_month)]
    months = np.array([r[0] for r in rows])
    pairs = np.array([f"{r[1]}|{r[2]}" for r in rows])
    product_month = np.array([f"{r[2]}|{r[0]}" for r in rows])
    origin_month = np.array([f"{r[1]}|{r[0]}" for r in rows])
    y = np.log(np.array([r[3] for r in rows]))
    burden = np.array([b[r[1], r[2]] for r in rows])
    return y, burden * (months >= post), pairs, product_month, origin_month, burden, months


def half_year(months):
    return np.array([f"{m[:4]}H{1 if m[5:] <= '06' else 2}" for m in months])


def event_study(with_origin_month=False):
    """Burden x half-year, relative to 2023H1. Flat before 2026 is what a causal reading needs."""
    y, _, pairs, pm, om, burden, months = panel()
    halves = half_year(months)
    periods = [p for p in sorted(set(halves)) if p != "2023H1"]
    xs = [burden * (halves == p) for p in periods]
    groups = [pairs, pm, om] if with_origin_month else [pairs, pm]
    beta, se, n, g = fit_many(y, xs, groups, pairs)
    return [{"period": p, "beta": float(b), "se": float(s)} for p, b, s in zip(periods, beta, se)]


def estimates():
    y, x, pairs, pm, om, _, _ = panel()
    y2, x2, p2, pm2, om2, _, _ = panel(last_month="2025-12", post="2025-01")
    return {
        "base": fit(y, x, [pairs, pm], pairs),
        "with_origin_month": fit(y, x, [pairs, pm, om], pairs),
        "placebo_2025": fit(y2, x2, [p2, pm2], p2),
        "placebo_2025_origin_month": fit(y2, x2, [p2, pm2, om2], p2),
    }


def ytd_change(origin, hs4_filter=None, months=None):
    """Tonnes change, same months of 2026 against 2025, on scope goods."""
    a, b = totals("2025", months), totals("2026", months)

    def s(t):
        return sum(v[1] for (o, h), v in t.items()
                   if o == origin and in_scope(h) and (hs4_filter is None or hs4_filter(h)))

    return s(b) / s(a) - 1 if s(a) else 0.0


def months_available():
    return sorted({r[0] for r in trade()})


def supplier_ranking(hs6):
    base = totals()
    return sorted(((v[1], o) for (o, h), v in base.items() if h == hs6), reverse=True)
