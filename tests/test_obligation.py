"""Golden numbers below were worked by hand from the formula, not produced by the model."""
import pytest

from data.facts import CBAM_FACTOR_LAW, CBAM_FACTOR_PROPOSAL, YEARS
from data.tables import benchmark_a, benchmark_b, default_for
from model import decision as d
from model import obligation as o


def test_official_rows_match_the_workbook():
    assert default_for("IN", "731815") == (5.72, "(C)")
    assert default_for("IN", "7213") == (4.27, "(C)")
    assert default_for("TW", "731815")[0] == 2.707
    assert default_for("TW", "7606")[1] == "(L)"


def test_country_without_a_row_falls_back_to_other_table():
    assert default_for("MY", "731815") == default_for("OTHER", "731815")


def test_code_outside_scope_returns_none():
    assert default_for("IN", "740311") is None


def test_benchmarks_by_route():
    assert benchmark_b("7213", "(C)", 2026) == 1.364
    assert benchmark_b("7213", "(E)", 2026) == 0.066
    assert benchmark_b("7606", "(K)", 2026) == 1.485
    assert benchmark_b("7606", "(L)", 2026) == 0.148
    assert benchmark_a("731815") == 0.038


def test_stainless_benchmark_steps_down_after_2027():
    assert benchmark_b("73181535", "", 2026) == 1.154
    assert benchmark_b("73181535", "", 2028) == 1.116


def test_mark_up_schedule():
    assert [o.mark_up(y) for y in (2026, 2027, 2028, 2034)] == [0.10, 0.20, 0.30, 0.30]


def test_factor_schedules_end_where_the_sources_say():
    assert CBAM_FACTOR_LAW[2026] == 0.975
    assert CBAM_FACTOR_LAW[2034] == 0.0
    assert CBAM_FACTOR_PROPOSAL[2034] == 0.15
    assert all(CBAM_FACTOR_PROPOSAL[y] >= CBAM_FACTOR_LAW[y] for y in YEARS)


def test_floor_at_zero_q432():
    assert o.certificates(1.0, 1.3) == 0.0
    assert o.certificates(1.0, 0.5, carbon_paid=0.6) == 0.0


def test_golden_default_2026():
    # SEE 5.72 x 1.10 = 6.292; SEFA 0.975 x 1.364 = 1.3299; net 4.9621
    see = o.see_default(5.72, 2026)
    sefa = o.sefa_default(1.364, 2026)
    assert see == pytest.approx(6.292)
    assert sefa == pytest.approx(1.3299)
    assert o.certificates(see, sefa) == pytest.approx(4.9621)


def test_golden_naive_shorthand_understates_2026():
    # 6.292 x 0.025 = 0.1573, so the true figure is about 31.5 times larger
    naive = o.naive_certificates(6.292, 2026)
    assert naive == pytest.approx(0.1573)
    assert 4.9621 / naive == pytest.approx(31.545, abs=0.01)


def test_golden_own_process():
    # 57 x 0.0404 x 77.4 = 178.24; 30 x 0.0473 x 63.1 = 89.54; 267.78 / 600 = 0.4463
    assert d.own_process_intensity() == pytest.approx(0.4463, abs=1e-4)


def test_golden_mill_route_2027():
    # m = 650/600 = 1.08333
    # SEE = 0.4463 + 1.08333 x 2.6 = 3.2630
    # SEFA = 0.95 x (0.038 + 1.08333 x 1.364) = 1.4400
    # net = 1.8230
    e = d.archetype()
    assert d.certs(e, 2027)["mill"] == pytest.approx(1.8230, abs=2e-4)


def test_golden_verify_only_2027_carries_marked_up_precursor():
    # SEE = 0.4463 + 1.08333 x (4.27 x 1.20) = 5.9973; net of 1.4400 = 4.5573
    e = d.archetype()
    assert d.certs(e, 2027)["verify"] == pytest.approx(4.5573, abs=2e-4)


def test_golden_green_loses_free_allocation_2027():
    # SEE = 0.4463 + 1.08333 x 1.0 = 1.5296
    # SEFA = 0.95 x (0.038 + 1.08333 x 0.066) = 0.1040
    # net = 1.4256
    e = d.archetype()
    assert d.certs(e, 2027)["green"] == pytest.approx(1.4256, abs=2e-4)


def test_flip_tonnes_is_where_costs_cross():
    e = d.archetype()
    t = d.flip_tonnes(e, 2028, "mill")
    e.tonnes = t
    a = d.annual_hit(e, 2028)
    assert a["mill"] == pytest.approx(a["stay"])


def test_pv_flip_matches_numeric_sweep():
    e = d.archetype()
    t = d.flip_tonnes_pv(e, "mill")
    lo, hi = 1.0, 5000.0
    for _ in range(60):
        e.tonnes = (lo + hi) / 2
        pv = d.present_hit(e)
        lo, hi = (e.tonnes, hi) if pv["mill"] > pv["stay"] else (lo, e.tonnes)
    assert t == pytest.approx(lo, rel=1e-6)


def test_flip_premium_makes_green_and_mill_equal():
    e = d.archetype()
    e.verify_cost = 0
    e.green_premium = d.flip_premium(e, 2030)
    a = d.annual_hit(e, 2030)
    assert a["green"] == pytest.approx(a["mill"])


def test_flip_carbon_price_makes_green_and_mill_equal():
    e = d.archetype()
    p = d.flip_carbon_price(e, 2034)
    a = d.annual_hit(e, 2034, price=p)
    assert a["green"] == pytest.approx(a["mill"])


def test_flip_mill_intensity_makes_mill_and_green_equal():
    e = d.archetype()
    e.s_mill = d.flip_mill_intensity(e)
    pv = d.present_hit(e)
    assert pv["mill"] == pytest.approx(pv["green"])


def test_any_verified_rod_below_the_marked_up_default_helps():
    e = d.archetype()
    e.s_mill = d.flip_intensity(e, 2028) - 1e-6
    c = d.certs(e, 2028)
    assert c["mill"] < c["verify"] + 1e-5


def test_defaults_beat_verifying_below_the_flip():
    e = d.archetype()
    e.tonnes = 20
    pv = d.present_hit(e)
    assert pv["stay"] < pv["mill"]
    assert pv["stay"] < pv["verify"]


def test_rival_term_cancels_between_eu_positions():
    e = d.archetype()
    gap = d.present_hit(e)["stay"] - d.present_hit(e)["mill"]
    e.rival = "CN"
    assert d.present_hit(e)["stay"] - d.present_hit(e)["mill"] == pytest.approx(gap)


def test_recommendation_at_archetype_is_verified_mill():
    assert d.recommend(d.archetype())[0] == "mill"
