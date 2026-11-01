import numpy as np
import pytest

from data.facts import CBAM_FACTOR_LAW
from model import exposure as x
from model import trade_effect as te


def test_cost_per_tonne_matches_hand_number():
    # (5.72 x 1.10 - 0.975 x 1.364) x 82.32
    assert x.cost_per_tonne("IN", "731815", 2026) == pytest.approx(4.9621 * 82.32, abs=0.01)


def test_non_scope_good_costs_nothing():
    assert x.cost_per_tonne("IN", "740311", 2026) == 0.0


def test_lower_default_origin_pays_less():
    assert x.cost_per_tonne("TW", "731815", 2026) < x.cost_per_tonne("IN", "731815", 2026)


def test_cost_rises_every_year_under_law():
    costs = [x.cost_per_tonne("IN", "731815", y) for y in sorted(CBAM_FACTOR_LAW)]
    assert costs == sorted(costs)


def test_divert_price_loss_is_positive_and_uses_2025():
    m = x.fob_markets()
    assert m["EU27"]["kt"] > m["UK"]["kt"]
    assert x.divert_price_loss() > 0


def _synthetic(beta, seed=7):
    rng = np.random.default_rng(seed)
    pairs, months, y, dose = [], [], [], []
    for i in range(40):
        burden = 0.2 if i < 20 else 0.0
        fe = rng.normal(0, 2)
        for t in range(24):
            post = t >= 12
            pairs.append(i)
            months.append(t + 100 * (i % 4))  # product-month cells shared across pairs
            dose.append(burden * post)
            y.append(fe + 0.1 * t + beta * burden * post + rng.normal(0, 0.05))
    return map(np.array, (y, dose, pairs, months))


def test_fit_recovers_a_known_effect():
    y, dose, pairs, months = _synthetic(-1.5)
    r = te.fit(y, dose, [pairs, months], pairs)
    assert r["beta"] == pytest.approx(-1.5, abs=0.1)


def test_fit_finds_nothing_when_nothing_happened():
    y, dose, pairs, months = _synthetic(0.0)
    r = te.fit(y, dose, [pairs, months], pairs)
    assert abs(r["beta"]) < 0.1
