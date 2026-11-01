"""Pull EU27 monthly imports by origin and HS6 from Eurostat Comext (DS-045409)."""
import csv, json, sys, time, urllib.request
from pathlib import Path

HERE = Path(__file__).parent
BASE = "https://ec.europa.eu/eurostat/api/comext/dissemination/sdmx/2.1/data/DS-045409"
ORIGINS = ["IN", "CN", "TR", "VN", "KR", "TW", "JP", "TH", "ID", "MY", "UA", "GB", "BR", "US"]
START, END = "2023-01", "2026-12"
CHUNK = 150


def fetch(origin, products):
    key = f"M.EU27_2020.{origin}.{'+'.join(products)}.1.VALUE_IN_EUROS+QUANTITY_IN_100KG"
    url = f"{BASE}/{key}?format=JSON&startPeriod={START}&endPeriod={END}"
    for attempt in range(4):
        try:
            with urllib.request.urlopen(url, timeout=240) as r:
                return json.load(r)
        except Exception as e:
            print(f"retry {origin} {attempt}: {e}", file=sys.stderr)
            time.sleep(5 * (attempt + 1))
    raise RuntimeError(f"Eurostat failed for {origin}")


def rows(d, origin):
    """Decode SDMX-JSON: value keys are flat indexes over (product, indicator, time)."""
    idx = {k: d["dimension"][k]["category"]["index"] for k in ("product", "indicators", "time")}
    inv = {k: {v: c for c, v in m.items()} for k, m in idx.items()}
    size = dict(zip(d["id"], d["size"]))
    n_ind, n_t = size["indicators"], size["time"]
    cells = {}
    for pos, val in d["value"].items():
        pos = int(pos)
        t = pos % n_t
        i = (pos // n_t) % n_ind
        p = pos // (n_t * n_ind) % size["product"]
        key = (inv["time"][t], inv["product"][p])
        cells.setdefault(key, {})[inv["indicators"][i]] = val
    for (month, hs6), c in cells.items():
        yield month, origin, hs6, c.get("VALUE_IN_EUROS", 0), c.get("QUANTITY_IN_100KG", 0) / 10
    # quantity in 100 kg -> tonnes


def main():
    codes = (HERE / "raw/hs6_scope.txt").read_text().split()
    out = HERE / "raw/trade_hs6_monthly.csv"
    n = 0
    with out.open("w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["month", "origin", "hs6", "value_eur", "tonnes"])
        for origin in ORIGINS:
            buf = []
            for i in range(0, len(codes), CHUNK):
                buf += list(rows(fetch(origin, codes[i:i + CHUNK]), origin))
            buf.sort()
            w.writerows(buf)
            n += len(buf)
            print(origin, len(buf), flush=True)
    print("rows", n)


if __name__ == "__main__":
    main()
