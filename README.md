# cbam-exposure-case

CBAM told like a case file: what should an Indian steel-products exporter do
about the EU's carbon border charge before 2034? Official default and benchmark
tables, a 14-origin Eurostat panel, closed-form triggers, and a stay / verify /
re-source / divert decision surface an exporter can re-run.

**C3 flagship — the Regulatory Shock Case.** C1 (`ma-case-file`) answers "should
we acquire". C2 (`growth-market-entry`) answers "should we enter, and how". This
one answers "a regulator just redrew our cost curve, what do we do". The decision
page is the deliverable, not a description of CBAM.

**Try it live: https://vedantk910.github.io/cbam-exposure-case/**

## The honest numbers

The correction:
- The "2.5% payable in 2026" shorthand holds only at the EU benchmark. Certificates
  are `embedded emissions - free allocation - carbon price paid`, and free allocation
  is a benchmark amount (Commission Q&A 3.7, 3.8, 4.32). India's marked-up default for
  bolts is 4.6x that benchmark, so **79%** of it is charged in 2026.
- That is 4.96 certificates a tonne, not 0.16: a factor of 32.

The decision (600 t/yr fictional exporter, 2027-34 present value, rival Taiwan on defaults):

| Position | Hit |
|---|---|
| Verified rod from the current mill | EUR 23k |
| Low-carbon rod | EUR 417k |
| Verify own plant only | EUR 879k |
| Stay on defaults | EUR 1.06M |
| Sell outside the EU | EUR 1.31M |

The triggers:
- **Flip volume:** verified rod beats defaults above **55 t/yr**, closed form, pinned
  to a numeric sweep. Verifying the plant alone needs 217 t/yr.
- **The prize is in the rod:** 73% of the saving comes from the mill's report.
- **Green steel loses for now:** free allocation falls with the cleaner route, taking
  back 77% of the gain in 2027. It wins if the mill is above 3.9 tCO2e/t, or if carbon
  passes EUR 112/t in 2034 at a EUR 179/t premium.

The sector: EUR 1.16bn in 2026 at 2025 volumes on defaults, 22% of value, against
EUR 41M on the shorthand.

The evidence that did not cooperate: EU trade through August 2026 shows no average
effect distinguishable from zero (beta -0.34, se 0.34). The case rests on the rule's
arithmetic, not on a trade effect.

## What it does

1. **Data** — the Commission's default-value and benchmark workbooks, Eurostat
   Comext (194,612 monthly rows), UN Comtrade, ECB rates. Every fact is tagged
   PRIMARY, OFFICIAL_DATA, SECONDARY or ASSUMPTION in `data/facts.py`.
2. **Model** — the `model/` package:
   - `obligation.py` — the legal formula, per tonne
   - `exposure.py` — product and origin bills on the default route
   - `decision.py` — five positions on one yardstick, with closed-form flips
   - `trade_effect.py` — dose-response panel, event study, placebo
3. **Output** — `out/decision_numbers.json`, `report/decision_page.md` rendered from
   it, and the interactive site in `site/`.

## Project layout

```
data/       # facts, official lookups, fetch scripts, raw CSVs
model/      # obligation.py, exposure.py, decision.py, trade_effect.py
report/     # decision_page.md, generated
site/       # static decision tool; engine.js mirrors model/
tests/      # pytest suite, offline
out/        # every quoted number
```

## Quick start

```bash
pip install -r requirements.txt
python run_case.py          # regenerates every number, the report and the site data
python -m pytest tests -q   # offline tests, hand-worked goldens
node site/verify.js         # the site's engine matches the Python model
```

Refreshing the raw data is optional: `python data/fetch_trade.py`,
`python data/fetch_comtrade.py`, `python data/extract_official.py`.

## 7-gate trail

- **G0 scope** — one decision for one exporter, as five positions that cover every move.
- **G1 build** — a tagged facts layer and four model modules, offline and deterministic.
- **G2 test** — goldens worked by hand from the formula; a closed-form-vs-numeric pin on
  the flip volume; recovery of a known effect on synthetic panel data.
- **G3 verify** — `run_case.py` regenerates `out/decision_numbers.json`; the report and
  site read only that output; CI regenerates the numbers and re-checks the README against them.
- **G4 stress/ablation** — 20 stress cases. Verified rod holds across carbon at EUR 40-150,
  the slower phase-out in COM(2026) 616, treble verification cost, a dirtier plant and every
  rival. The answer moves only if the mill exceeds 3.9 tCO2e/t, when low-carbon rod takes
  over, or below 55 t/yr, when defaults win. Removing the route-based benchmark would make
  green steel look 4x better, which is why that rule is the finding.
- **G5 document** — this README, the decision page, and limits stated in both.
- **G6 hostile pass** — the attacks and the answers:

| Attack | Answer |
|---|---|
| "The Commission says CBAM applies only to the share without free allowances. Isn't 2.5% right?" | Right at the benchmark, wrong above it. Q&A 3.7 subtracts a benchmark-based amount. India's default for bolts is 4.6x that benchmark. |
| "No Indian mill has published 2.6 tCO2e/t." | It is the weakest input. At 3.5 verified rod still wins; above 3.9 low-carbon rod takes over. At this volume defaults never come back, so the ranking holds even though the size of the prize moves. |
| "The verification cost is one press figure." | Treble it and the trigger moves from 55 to 164 t/yr. |
| "The importer pays CBAM, so why should an exporter care?" | A buyer will not pay more than the next supplier's landed cost. The gap comes out of the exporter's price. |
| "Rivals will verify too." | The ranking does not change: the rival term cancels between positions that stay in the EU. |
| "The EU may slow the phase-out." | COM(2026) 616 moves the verified-rod hit by EUR 3k. The gap between defaults and verified data barely depends on the schedule. |
| "Trade has not fallen." | Not proven yet. No certificate has been sold and the data ends in August 2026. |

## What went wrong along the way

- The first plan read the 2.5% at face value and put a verified figure at about EUR 1,400
  for 2026. The Commission's Q&A reversed that.
- A combined exporter-importer yardstick made leaving the EU look free. It was replaced
  with what the exporter absorbs after a rival's own bill.
- The first regression failed its placebo (t above 3). Burden was built from 2025 prices,
  which move with 2025 tonnes. Rebasing to 2023 took the placebo to -0.2 and removed a
  2025 surge that had looked like front-running.

## Limits

No exporter, mill or verifier was interviewed, and the exporter is fictional. No Indian
mill's verified figure is public. Verifier fees are unpublished. EUR-Lex refuses automated
access, so equation forms come from the Commission's Q&A and benchmark workbooks, and steel
quota coverage of 7318 and 7326 is inferred. Carbon is held flat, not forecast.

What I would change next: ask five mills whether they hold a verification report and at
what intensity, and ask five exporters what their buyers have requested so far.
