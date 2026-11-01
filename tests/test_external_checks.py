"""Figures published by other people. If the model drifts from these, something is wrong."""
import pytest

from data.facts import CROWE_EXAMPLES, EFDA_EXAMPLES, EFDA_INDIA
from data.tables import benchmark_b, default_for
from model import buyer
from model.exposure import net_certificates
from model.obligation import certificates, see_default, sefa_default


def model_cost(origin, code, price, year=2026):
    default, route = default_for(origin, code)
    return certificates(see_default(default, year), sefa_default(benchmark_b(code, route, year), year)) * price


@pytest.mark.parametrize("name,origin,code,published", EFDA_EXAMPLES)
def test_efda_worked_examples(name, origin, code, published):
    assert model_cost(origin, code, 80.0) == pytest.approx(published, abs=0.05)


def test_efda_india_example_matches_on_its_own_benchmark_and_differs_on_the_file():
    name, origin, code, published = EFDA_INDIA
    assert model_cost(origin, "731815", 80.0) == pytest.approx(published, abs=0.05)
    assert benchmark_b(code, "(C)", 2026) == 1.154
    assert model_cost(origin, code, 80.0) == pytest.approx(413.35, abs=0.05)


def test_efda_actual_values_example():
    # EFDA: (2.130 - 1.520 x 0.975) x 80 = 51.84
    assert certificates(2.130, sefa_default(1.520, 2026)) * 80 == pytest.approx(51.84, abs=0.005)


@pytest.mark.parametrize("name,origin,quoted", CROWE_EXAMPLES)
def test_crowe_rough_figures_within_ten_percent(name, origin, quoted):
    assert net_certificates(origin, "731815", 2026) * 90 == pytest.approx(quoted, rel=0.1)


def test_buyer_list_is_cheapest_first_and_adds_cbam():
    rows = buyer.landed("731815", 2027)
    assert [r["landed"] for r in rows] == sorted(r["landed"] for r in rows)
    assert all(r["landed"] == pytest.approx(r["price"] + r["cbam"]) for r in rows)


def test_cbam_moves_india_down_on_plate_and_not_on_bolts():
    plate = buyer.rank_shift("720851")
    bolts = buyer.rank_shift("731815")
    assert plate["after"] > plate["before"]
    assert bolts["after"] == bolts["before"]
