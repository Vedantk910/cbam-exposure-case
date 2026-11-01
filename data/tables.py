"""Lookups over the official CSVs: default values and CBAM benchmarks by code."""
import csv
from functools import lru_cache
from pathlib import Path

RAW = Path(__file__).parent / "raw"


@lru_cache
def _defaults():
    out = {}
    with (RAW / "defaults_official.csv").open() as f:
        for r in csv.DictReader(f):
            out.setdefault(r["origin"], {})[r["cn"]] = (float(r["default_tco2_t"]), r["route"])
    return out


@lru_cache
def _benchmarks():
    with (RAW / "benchmarks_official.csv").open() as f:
        return [(r["cn8"], float(r["col_a_process"] or 0), float(r["col_b_with_precursors"] or 0), r["route"])
                for r in csv.DictReader(f)]


def default_for(origin, code):
    """(default tCO2e/t, route) for an origin and code, or None if out of CBAM scope.

    The workbook mixes 4, 6 and 8 digit rows. Parents win; finer lines are averaged.
    A country with no row uses the 'Other countries' table, as Q4.25 requires.
    """
    table = _defaults().get(origin, {})
    for n in (len(code), 6, 4):
        if code[:n] in table:
            return table[code[:n]]
    # shortcut: simple mean of CN8 lines, upgrade to CN8 tonnage weights if lines ever diverge materially
    kids = [v for c, v in table.items() if c.startswith(code)]
    if kids:
        return sum(k[0] for k in kids) / len(kids), kids[0][1]
    return default_for("OTHER", code) if origin != "OTHER" else None


def benchmark_b(code, route, year):
    """Column B, with precursors. Reg. 2025/2620: highest value for the production year."""
    period = "(1)" if year <= 2027 else "(2)"
    rows = [r for r in _benchmarks() if r[0].startswith(code)]
    tokens = [t for t in route.replace("/", "").replace(")", ") ").split() if t]

    def eligible(row_route):
        if "(1)" in row_route or "(2)" in row_route:
            if period not in row_route:
                return False
        letters = row_route.replace("(1)", "").replace("(2)", "")
        return not tokens or not letters or any(t in letters for t in tokens)

    values = [r[2] for r in rows if eligible(r[3])]
    return max(values) if values else 0.0


def benchmark_a(code):
    """Column A, the process step alone, used on the actual-values route."""
    return max((r[1] for r in _benchmarks() if r[0].startswith(code)), default=0.0)
