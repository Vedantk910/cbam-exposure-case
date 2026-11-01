# PROJECT BLUEPRINT — CBAM Exposure Case (C3 flagship)

_Design record, 2026-11-01._

## 1. The case

**Client framing.** An Indian steel-products exporter, represented by a 600 t/yr fastener maker, asks: *what should we do about CBAM between now and 2034?*

**Why this question.** C1 (`ma-case-file`) answers "should we acquire". C2 (`growth-market-entry`) answers "should we enter". C3 answers the third case type a strategy interview tests: "a regulator just changed our cost curve, what do we do?"

**Options (MECE).** Every exporter ends up in one of four positions:

| Option | What it means | What changes in the formula |
|---|---|---|
| A. Stay on defaults | Buyer declares EU default values | Nothing; mark-up applies |
| B. Verify own process | Own fuel data verified; precursors stay on default | Own process actual; precursor default with mark-up |
| C. Verified steel | Buy rod with a verified mill report and verify own process | Both actual |
| D. Divert | Move volume out of the EU | CBAM falls away; price and market access change |

C splits into verified rod from the current mill and low-carbon rod, because the free allocation benchmark treats them differently.

## 2. Findings that frame it (primary-source checked)

1. **Reg. 2025/2620 subtracts a benchmark, it does not scale the bill.** `certificates = (SEE − SEFA − carbon price paid) × tonnes`, floored at zero per good. The "2.5% in 2026" shorthand is true only for emissions at benchmark. Emissions above benchmark are charged in full from day one. Source: Commission CBAM Q&A of 15 Oct 2026, 3.7, 3.8, 4.32.
2. **Default precursors inside an actual calculation carry the mark-up.** Q&A 4.25.
3. **CSCF is 100% for 2026–2030.** Implementing Decision (EU) 2026/1862.
4. **No Indian carbon price is deductible today.** No Art. 9 recognition, no CCTS trades. The India–EU FTA gave no CBAM carve-out.
5. **Steel TRQ (Reg. 2026/1384, 50% out of quota from 1 Jul 2026) is a separate and larger constraint on flat products.** Downstream goods are flagged by law firms as not yet covered; review due by 30 Jun 2027. Coverage of 7318 and 7326 is inferred, not read from Annex I (EUR-Lex refuses automated access).

## 3. Architecture

Static by design: no server, no keys, nothing to expire before a recruiter clicks it.

```
official workbooks ─┐
Eurostat Comext ────┤→ data/ (tagged facts + raw CSV)
secondary sources ──┘        │
                             ▼
                model/ obligation → exposure → decision → trade_effect
                             │
                run_case.py  ├→ out/decision_numbers.json (every quoted number)
                             ├→ site/data.json            (what the browser needs)
                             └→ report/decision_page.md   (rendered from numbers)
                             │
                site/engine.js  same formulas in JS ← site/verify.js pins to Python
```

| Layer | Choice | Why |
|---|---|---|
| Data | stdlib + CSV committed | Offline, deterministic; one fetch script to refresh |
| Model | Python + numpy | numpy only for the panel regression |
| Tests | pytest, hand-computed goldens | Formula errors are the main risk |
| Site | Plain HTML, CSS, JS, inline SVG | No build, no framework |
| Hosting | GitHub Pages | Free, static, no keys to expire |

## 4. Rules of the build

- Seven gates as in C1 and C2: G0 scope, G1 build, G2 test, G3 verify, G4 stress/ablation, G5 document, G6 hostile pass.
- Every fact is tagged `PRIMARY`, `OFFICIAL_DATA`, `SECONDARY` or `ASSUMPTION`, with a source id.
- Reports quote only `out/decision_numbers.json`.
- Nothing is invented: no customer interviews, no hours, no client. The archetype is labelled fictional.

## 5. Non-goals

Document extraction, login, Hindi UI, filing or verification services, other CBAM sectors (cement, fertiliser, hydrogen, electricity), separate PowerPoint deck.
