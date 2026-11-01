# cbam-exposure-case

CBAM told like a case file: what should an Indian steel-products exporter do about the EU's carbon border charge before 2034, and what does it mean for the EU buyer on the other side of the trade? Official default and benchmark tables, a 14-origin Eurostat panel, real plant data and closed-form triggers, with a decision tool anyone can re-run.

**C3 flagship: the regulatory shock case.** C1 (`ma-case-file`) answers "should we acquire". C2 (`growth-market-entry`) answers "should we enter, and how". This one answers "a regulator just redrew our cost curve, what do we do". The decision page is the deliverable.

**Live site: https://vedantk910.github.io/cbam-exposure-case/**

## The honest numbers

The correction:
- The "2.5% payable in 2026" shorthand holds only at the EU benchmark. Certificates are `embedded emissions - free allocation - carbon price paid`, and free allocation is a benchmark amount (Commission Q&A 3.7, 3.8, 4.32). India's marked-up default for bolts is 4.6x that benchmark, so **79%** of it is charged in 2026.
- That is 4.96 certificates a tonne against 0.16 on the shorthand, or 32 times more.

The outside check:
- The European Fastener Distributor Association prints the same formula. Seven of its eight worked examples match this model to within 5 cents a tonne.
- The eighth is an Indian line, CN 7318 15 62. It matches on EFDA's benchmark of 1.364, but the Commission's file marks that line stainless (1.154), which would give EUR 413.35. That one is left open and the case uses carbon-steel bolts.

The decision (600 t/yr fictional exporter, 2027-34 present value, rival Taiwan on defaults, verified rod at 3.06 tCO2e/t from the median of ten Indian plants plus rolling):

| Position | Hit |
|---|---|
| Verified rod from the current mill | EUR 160k |
| Low-carbon rod | EUR 417k |
| Verify own plant only | EUR 879k |
| Stay on defaults | EUR 1.06M |
| Sell outside the EU | EUR 1.31M |

The triggers:
- **Flip volume:** verified rod beats defaults above **62 t/yr**, closed form, pinned to a numeric sweep. Verifying the plant alone needs 217 t/yr.
- **The prize is in the rod:** 69% of the saving comes from the mill's report.
- **Low-carbon rod comes second:** free allocation falls with the cleaner route, taking back 60% of the gain in 2027. It wins if the mill is above 3.9 tCO2e/t, and all ten listed plants sit below that. In 2034 it wins once carbon passes EUR 87/t at a EUR 179/t premium, so the question comes back around 2030.

The EU buyer: on bolts the order of suppliers does not change. On hot-rolled plate India moves from number 3 to number 8 of 9 origins.

The sector: EUR 1.16bn in 2026 at 2025 volumes on defaults, 22% of value, against EUR 41M on the shorthand.

The evidence that did not cooperate: EU trade through August 2026 shows no average effect distinguishable from zero (beta -0.34, se 0.34). The case rests on the rule's arithmetic and has no trade effect behind it yet.

## What it does

1. **Data:** the Commission's default-value and benchmark workbooks, Eurostat Comext (194,612 monthly rows), UN Comtrade, ECB rates, draft plant baselines. Every fact is tagged PRIMARY, OFFICIAL_DATA, SECONDARY or ASSUMPTION in `data/facts.py`.
2. **Model:** the `model/` package:
   - `obligation.py`: the legal formula, per tonne
   - `exposure.py`: product and origin bills on the default route
   - `decision.py`: five positions on one yardstick, closed-form flips, sensitivity
   - `buyer.py`: landed cost by origin for an EU buyer
   - `trade_effect.py`: dose-response panel, event study, placebo
3. **Output:** `out/decision_numbers.json`, `report/decision_page.md` rendered from it, and the site in `site/`.

The site has six pages: the case, how CBAM works, the decision tool (exporter view, buyer view, dependency map, sensitivity), the evidence, how the work went, and sources.

## Project layout

```
data/       # facts, official lookups, fetch scripts, raw CSVs
model/      # obligation, exposure, decision, buyer, trade_effect
report/     # decision_page.md, generated
site/       # static site; engine.js mirrors model/
tests/      # pytest suite, offline, includes figures published by others
out/        # every quoted number
```

## Quick start

```bash
pip install -r requirements.txt
python run_case.py          # regenerates every number, the report and the site data
python -m pytest tests -q   # offline tests
node site/verify.js         # the site's engine matches the Python model
```

Refreshing the raw data is optional: `python data/fetch_trade.py`, `python data/fetch_comtrade.py`, `python data/extract_official.py`.

## 7-gate trail

- **G0 scope:** one decision for one exporter, as five positions that cover every move.
- **G1 build:** a tagged facts layer and five model modules, offline and deterministic.
- **G2 test:** goldens worked out separately from the formula, a closed-form-vs-numeric pin on the flip volume, recovery of a known effect on synthetic panel data, and EFDA's published examples.
- **G3 verify:** `run_case.py` regenerates `out/decision_numbers.json`; the report and site read only that output; CI regenerates the numbers and re-checks this README against them.
- **G4 stress/ablation:** 23 stress cases. Verified rod holds across carbon at EUR 40-120, the slower phase-out in COM(2026) 616, treble verification cost, every listed plant and every rival. It gives way to low-carbon rod at EUR 150 carbon or above 3.9 tCO2e/t, and to defaults below 62 t/yr.
- **G5 document:** this README, the decision page, and limits stated in both.
- **G6 hostile pass:** the attacks and the answers:

| Attack | Answer |
|---|---|
| "The Commission says CBAM applies only to the share without free allowances. Isn't 2.5% right?" | Right at the benchmark, wrong above it. Q&A 3.7 subtracts a benchmark-based amount, and EFDA prints the same formula. |
| "No Indian mill has published a verified figure." | It rests on draft baselines for ten named plants, and that is its weakest point. Verified rod stays first across the whole range. |
| "Small re-rolling mills are not in that list." | True. Whether they can get verified at all is the first interview question. |
| "The verification cost is one press figure." | Treble it and the trigger moves from 62 to 186 t/yr. |
| "Verifiers will not get to fastener makers in time." | EFDA expects a bottleneck, so the base case starts in 2027. If verified data slips to 2029 the ranking holds. |
| "EFDA says forging is outside the boundary." | The model keeps it in, the cautious side. Taking it out improves verified rod and the answer stays the same. |
| "The importer pays CBAM, so why should an exporter care?" | A buyer will not pay more than the next supplier's landed cost. The gap comes out of the exporter's price. |
| "Rivals will verify too." | The ranking does not change: the rival term cancels between positions that stay in the EU. |
| "Trade has not fallen." | Unproven either way. No certificate has been sold and the data ends in August 2026. |

## What went wrong along the way

- The first plan read the 2.5% at face value and put a verified figure at about EUR 1,400 for 2026. The Commission's Q&A reversed that.
- A combined exporter-importer yardstick made leaving the EU look free. It was replaced with what the exporter absorbs after a rival's own bill.
- The first regression failed its placebo (t above 3). Burden was built from 2025 prices, which move with 2025 tonnes. Rebasing to 2023 took the placebo to -0.2 and removed a 2025 surge that had looked like front-running.
- An early draft quoted a 15-22% think-tank estimate that was not on any cited page. It came out.
- The first rod estimate of 2.6 was too kind. Real plant data moved it to 3.06, and the result got worse while the ranking held.

## Limits

No exporter, mill or verifier was interviewed, and the exporter is fictional. Plant figures are draft crude-steel baselines read from a secondary source, and small re-rolling mills are missing. Verifier fees are unpublished. EUR-Lex refuses automated access, so the formula comes from the Commission's Q&A, EFDA's guide and the benchmark workbook, and steel quota coverage of 7318 and 7326 is inferred. Carbon is held flat, not forecast.

What I would change next: ask five mills whether they hold a verification report and at what intensity, and ask five exporters what their buyers have requested so far.
