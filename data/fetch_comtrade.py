"""India's exports of the case product by destination, from the UN Comtrade public preview."""
import csv, json, time, urllib.request
from pathlib import Path

OUT = Path(__file__).parent / "raw/india_exports_731815.csv"
URL = ("https://comtradeapi.un.org/public/v1/preview/C/A/HS?reporterCode=699&period={y}"
       "&cmdCode=731815&flowCode=X&partner2Code=0&motCode=0&customsCode=C00")

with OUT.open("w", newline="") as f:
    w = csv.writer(f)
    w.writerow(["year", "partner_code", "kg", "fob_usd"])
    for year in (2023, 2024, 2025):
        with urllib.request.urlopen(URL.format(y=year), timeout=60) as r:
            data = json.load(r)["data"]
        rows = [[year, d["partnerCode"], d["netWgt"] or d["qty"], d["primaryValue"]] for d in data]
        w.writerows(sorted(rows, key=lambda x: -x[3]))
        print(year, len(rows))
        time.sleep(20)  # the public preview rate-limits bursts
