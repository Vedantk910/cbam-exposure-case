"""The README is hand-written, so pin its headline figures to the generated numbers."""
import json
from pathlib import Path

import pytest

ROOT = Path(__file__).parent.parent


@pytest.fixture(scope="module")
def n():
    return json.loads((ROOT / "out/decision_numbers.json").read_text())


@pytest.fixture(scope="module")
def readme():
    return (ROOT / "README.md").read_text()


def test_headline(n, readme):
    h = n["headline"]
    assert f"{h['payable_share_2026']:.0%}" == "79%" and "**79%**" in readme
    assert f"{h['rows'][0]['net']:.2f}" in readme
    assert f"factor of {h['ratio_2026']:.0f}" in readme


def test_positions(n, readme):
    assert n["best"] == "mill"
    assert f"EUR {n['pv']['mill'] / 1e3:.0f}k" in readme
    assert f"EUR {n['pv']['green'] / 1e3:.0f}k" in readme
    assert f"EUR {n['pv']['verify'] / 1e3:.0f}k" in readme
    assert f"EUR {n['pv']['stay'] / 1e6:.2f}M" in readme
    assert f"EUR {n['pv']['divert'] / 1e6:.2f}M" in readme


def test_triggers(n, readme):
    f = n["flips"]
    assert f"**{f['tonnes_mill_pv']:.0f} t/yr**" in readme
    assert f"{f['tonnes_verify_pv']:.0f} t/yr" in readme
    assert f"{f['mill_vs_green']:.1f} tCO2e/t" in readme
    assert f"EUR {f['carbon_price_2034']:.0f}/t" in readme


def test_trade_result(n, readme):
    e = n["trade"]["estimates"]["base"]
    assert f"beta {e['beta']:.2f}, se {e['se']:.2f}" in readme
    assert abs(e["t"]) < 1.96
    assert abs(n["trade"]["estimates"]["placebo_2025"]["t"]) < 1.96


def test_stress_outcomes_match_the_claims(n):
    s = {r["case"]: r for r in n["stress"]}
    assert s["Carbon price EUR 40"]["answer"] == "mill"
    assert s["Carbon price EUR 150"]["answer"] == "mill"
    assert s["COM(2026) 616 slower phase-out"]["answer"] == "mill"
    assert s["Verification costs three times more"]["answer"] == "mill"
    assert s["Verified rod at 4.5 tCO2e/t"]["answer"] == "green"
    assert s["50 t per year exporter"]["answer"] == "stay"
    for rival in ("Viet Nam", "South Korea", "Türkiye", "China"):
        assert s[f"Rival is {rival}"]["answer"] == "mill"


def test_no_invented_interviews_or_ai_claims():
    text = (ROOT / "site/index.html").read_text().lower()
    assert "no exporter, mill or verifier was interviewed" in text
    assert "no ai" not in text
