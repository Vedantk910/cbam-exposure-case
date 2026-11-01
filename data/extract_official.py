"""Turn the two Commission workbooks into small CSVs the model can read.

stdlib only: an .xlsx is a zip of XML, and we need four columns from it.
"""
import csv
import hashlib
import re
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path

RAW = Path(__file__).parent / "raw"
OFFICIAL = RAW / "official"
NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
CHAPTERS = ("72", "73", "76")
SHEETS = {
    "IN": "India", "CN": "China", "TR": "Türkiye", "VN": "Viet Nam",
    "KR": "Korea, Republic of (South Korea", "TW": "Taiwan", "JP": "Japan",
    "TH": "Thailand", "ID": "Indonesia", "UA": "Ukraine", "GB": "United Kingdom",
    "BR": "Brazil", "US": "United States", "MY": "Malaysia",
    "OTHER": "_Other Countries and Territorie",
}


def sheets(path):
    z = zipfile.ZipFile(path)
    strings = [
        "".join(t.text or "" for t in si.iter(NS + "t"))
        for si in ET.fromstring(z.read("xl/sharedStrings.xml"))
    ]
    book = ET.fromstring(z.read("xl/workbook.xml"))
    names = [s.get("name") for s in book.find(NS + "sheets")]

    def rows(name):
        root = ET.fromstring(z.read(f"xl/worksheets/sheet{names.index(name) + 1}.xml"))
        for row in root.iter(NS + "row"):
            cells = {}
            for c in row:
                v = c.find(NS + "v")
                if v is not None:
                    col = re.sub(r"\d", "", c.get("r"))
                    cells[col] = strings[int(v.text)] if c.get("t") == "s" else v.text
            yield cells

    return names, rows


def number(text):
    """Workbook decimals use commas. '-' and 'see below' mean no value on this row."""
    try:
        return float(str(text).replace(",", "."))
    except ValueError:
        return None


def extract_defaults():
    names, rows = sheets(OFFICIAL / "default_values_2026-08-10.xlsx")
    out = []
    for iso, sheet in SHEETS.items():
        if sheet not in names:
            continue
        for r in rows(sheet):
            code = r.get("A", "").replace(" ", "")
            total = number(r.get("E"))
            if re.fullmatch(r"\d{4,10}", code) and code[:2] in CHAPTERS and total is not None:
                out.append([iso, code, total, r.get("F", "")])
    with (RAW / "defaults_official.csv").open("w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["origin", "cn", "default_tco2_t", "route"])
        w.writerows(out)
    return len(out)


def extract_benchmarks():
    """Rows with no CN code are extra routes for the code above them."""
    _, rows = sheets(OFFICIAL / "cbam_benchmarks_2026-02-06.xlsx")
    out, code = [], None
    for r in rows("Benchmarks"):
        if re.fullmatch(r"\d{8}", r.get("A", "")):
            code = r["A"]
        elif r.get("A"):
            code = None
        if code and code[:2] in CHAPTERS and "E" in r:
            out.append([code, number(r.get("C")), number(r["E"]), r.get("F", "")])
    with (RAW / "benchmarks_official.csv").open("w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["cn8", "col_a_process", "col_b_with_precursors", "route"])
        w.writerows(out)
    return len(out)


if __name__ == "__main__":
    print("defaults", extract_defaults(), "benchmarks", extract_benchmarks())
    for p in sorted(OFFICIAL.glob("*.xlsx")):
        print(p.name, hashlib.sha256(p.read_bytes()).hexdigest()[:16])
