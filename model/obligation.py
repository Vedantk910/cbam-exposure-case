"""The legal formula, per tonne of good.

certificates = max(0, SEE - SEFA - carbon price paid)     Commission Q&A 3.7, 4.32
SEE    = default x (1 + mark-up), or actual emissions
SEFA   = CBAM factor x CSCF x benchmark                   Reg. 2025/2620 Annex, Eq. 2, 4, 6
"""
from data.facts import CBAM_FACTOR_LAW, CSCF, MARKUP


def mark_up(year):
    return MARKUP[min(year, 2028)]


def see_default(default, year):
    return default * (1 + mark_up(year))


def see_actual(own_process, mass_ratio, precursor_see):
    """Own direct emissions plus the steel bought in."""
    return own_process + mass_ratio * precursor_see


def sefa_default(benchmark_b, year, schedule=CBAM_FACTOR_LAW):
    return schedule[year] * CSCF * benchmark_b


def sefa_actual(benchmark_a, mass_ratio, precursor_benchmark, year, schedule=CBAM_FACTOR_LAW):
    # shortcut: precursor SEFA uses its Column B route value, not the mill's own chain.
    # Upgrade if a mill publishes its process split.
    return schedule[year] * CSCF * (benchmark_a + mass_ratio * precursor_benchmark)


def certificates(see, sefa, carbon_paid=0.0):
    return max(0.0, see - sefa - carbon_paid)


def naive_certificates(see, year, schedule=CBAM_FACTOR_LAW):
    """The popular shorthand: only (1 - factor) of embedded emissions is payable. Wrong."""
    return see * (1 - schedule[year])
