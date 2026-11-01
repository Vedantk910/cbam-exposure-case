"""Every number the case rests on, tagged by how far it can be trusted.

Tags:
  PRIMARY        read from an EU legal or Commission document
  OFFICIAL_DATA  taken from an official statistical or regulatory dataset
  SECONDARY      reported by a third party, not checked against the primary text
  ASSUMPTION     a judgement call; every one is a slider on the site
"""

SOURCES = {
    "S01": ("Commission CBAM Questions and Answers (15 Oct 2026), Q1.5, 3.7-3.10, 4.25, 4.32, 5.12, 5.15, 5.18, 5.20, 5.21",
            "PRIMARY", "https://taxation-customs.ec.europa.eu/document/download/013fa763-5dce-4726-a204-69fec04d5ce2_en"),
    "S02": ("Commission default values workbook (10 Aug 2026, informative copy of Reg. 2025/2621 as corrected by 2026/1740)",
            "OFFICIAL_DATA", "https://taxation-customs.ec.europa.eu/carbon-border-adjustment-mechanism/cbam-legislation-and-guidance_en"),
    "S03": ("Commission CBAM benchmarks workbook (13 Feb 2026, informative copy of the Annex to Reg. 2025/2620)",
            "OFFICIAL_DATA", "https://taxation-customs.ec.europa.eu/carbon-border-adjustment-mechanism/cbam-legislation-and-guidance_en"),
    "S04": ("Implementing Regulation (EU) 2025/2620, text as reproduced by LawPlayer (equation bodies missing there)",
            "SECONDARY", "https://lawplayer.com/eu/act/32025R2620"),
    "S05": ("CBAM factor schedule, CSCF of 100% (Decision 2026/1862) and the SEFA formula, as stated by CBAM Guide",
            "SECONDARY", "https://cbamguide.com/learn/free-allocation/"),
    "S06": ("Q1-Q3 2026 CBAM certificate prices as reported by EUROMETAL and CBAM Partner",
            "SECONDARY", "https://cbampartner.eu/en/guide/cbam-certificate-price-2026.html"),
    "S07": ("Eurostat Comext DS-045409: EU imports by origin and HS6, monthly",
            "OFFICIAL_DATA", "https://ec.europa.eu/eurostat/comext/newxtweb/"),
    "S08": ("UN Comtrade public preview: India exports of HS 731815 by destination",
            "OFFICIAL_DATA", "https://comtradeplus.un.org/"),
    "S09": ("ECB reference exchange rates, October 2026 monthly average",
            "OFFICIAL_DATA", "https://data.ecb.europa.eu/"),
    "S10": ("Argus: EU-India FTA leaves CBAM untouched",
            "SECONDARY", "https://www.argusmedia.com/en/news-and-insights/latest-market-news/2781007-eu-india-fta-leaves-cbam-untouched"),
    "S11": ("CBAM Guide: no third-country carbon price recognised as of Oct 2026",
            "SECONDARY", "https://cbamguide.com/learn/eu-cbam/"),
    "S12": ("Climate Decode: India's CCTS has no recorded certificate trade",
            "SECONDARY", "https://climate-decode.com/insights/india-ccts-series/cbam-q3-2026-certificate-price"),
    "S13": ("Crowell: Regulation 2026/1384, TRQs and 50% duty from 1 Jul 2026, downstream review",
            "SECONDARY", "https://www.crowell.com/en/insights/client-alerts/eu-steel-overcapacity-regulation-new-permanent-measure-in-force-from-1-july-2026"),
    "S14": ("CMS: Regulation 2026/1384 scope and downstream products",
            "SECONDARY", "https://cms.law/en/deu/legal-updates/unprecedented-eu-steel-regulation-targets-global-overcapacity"),
    "S15": ("Loharo: quota balances, India category 1A allocation of 597,274 t",
            "SECONDARY", "https://loharo.com/eu-steel-quotas-q4-2026-balances-four-weeks/"),
    "S16": ("Business Standard: Rs 15-20 lakh per-unit CBAM compliance cost, attributed to industry sources",
            "SECONDARY", "https://www.business-standard.com/amp/economy/news/carbon-border-adjustment-mechanism-cbam-eu-india-msme-exporters-126063000478_1.html"),
    "S17": ("ICRA via SolarQuarter: Indian producers about 2.5 tCO2/t, scrap EAF about 0.7",
            "SECONDARY", "https://solarquarter.com/2026/01/21/icra-indias-steel-sector-to-cut-emissions-gradually-through-renewables-and-efficiency-gains-with-full-green-steel-adoption-a-long-term-goal"),
    "S18": ("EY: green steel premium of about USD 210/t",
            "SECONDARY", "https://www.ey.com/en_in/newsroom/2025/07/india-s-green-steel-demand-to-surge"),
    "S19": ("EPC World: green steel premium of about USD 190/t",
            "SECONDARY", "https://www.epcworld.in/?p=31574"),
    "S20": ("COM(2026) 616 proposal, slower free allocation phase-out, as reported by CBAM Guide; not law",
            "SECONDARY", "https://cbamguide.com/learn/free-allocation/"),
    "S21": ("Implementing Regulation (EU) 2025/2547, Annex II G fuel factors",
            "PRIMARY", "http://data.europa.eu/eli/reg_impl/2025/2547/oj"),
    "S22": ("FEPS-NIPFP study via Eco-Business: added cost of 16.06% of steel unit value",
            "SECONDARY", "https://www.eco-business.com/news/indian-steel-exports-could-suffer-as-the-eu-enforces-carbon-border-rules/"),
    "S23": ("Sentra.world via EUROMETAL: exposure could reach 10-20% of product cost",
            "SECONDARY", "https://eurometal.net/cbam-reshapes-indias-steel-access-to-europe-webinar/"),
    "S24": ("Section 232 steel derivatives: 7318 reported at 25-50%; sources conflict",
            "SECONDARY", "https://www.gaiadynamics.ai/blog/section-232-steel-aluminum-derivatives-in-2026-why-auto-parts-bearings-and-valves-got-caught-in-the-net"),
    "S25": ("UK CBAM from 1 Jan 2027, no India CETA exemption, fasteners listed at draft stage",
            "SECONDARY", "https://www.mayerbrown.com/en/insights/publications/2025/05/what-are-the-top-10-things-you-need-to-know-about-uk-cbam"),
}

YEARS = list(range(2026, 2035))

# S05: share of free allocation EU producers keep. Directive 2003/87/EC Art. 10a(1a).
CBAM_FACTOR_LAW = dict(zip(YEARS, [0.975, 0.95, 0.90, 0.775, 0.515, 0.39, 0.265, 0.14, 0.0]))
# S20: not adopted. 2034-2037 sit at 15% under the proposal.
CBAM_FACTOR_PROPOSAL = dict(zip(YEARS, [0.975, 0.95, 0.915, 0.81, 0.59, 0.48, 0.375, 0.27, 0.15]))

MARKUP = {2026: 0.10, 2027: 0.20, 2028: 0.30}  # S01 Q4.25, steel and aluminium
CSCF = 1.0  # S05, Decision (EU) 2026/1862 for 2026-2030; assumed unchanged after

PRICE_2026_Q = [75.36, 75.28, 82.32]  # S06, EUR/t, Q4 not yet published
PRICE_BASE = 82.32  # ASSUMPTION: held flat at the latest print, no forecast

EUR_INR = 107.01  # S09
USD_PER_EUR = 1.1202  # S09

# Fictional archetype from the fuel inputs of the worked example. Factors: S21.
ARCHETYPE = {
    "name": "Bharat Fasteners (fictional)",
    "hs6": "731815",
    "tonnes": 600.0,
    "precursor": "7213",
    "precursor_tonnes": 650.0,
    "furnace_oil_t": 57.0,
    "lpg_t": 30.0,
}
FUEL = {"furnace_oil": (0.0404, 77.4), "lpg": (0.0473, 63.1)}  # TJ/t, tCO2/TJ

ASSUMPTIONS = {
    "verify_cost_eur": (round(2_000_000 / EUR_INR), "Annual verification and compliance cost", "EUR/yr",
                        "Upper end of the Rs 15-20 lakh reported per unit. No verifier publishes a fee, and it may include consultants.", "S16"),
    "s_mill": (2.6, "Verified intensity of the current BF-BOF rod", "tCO2e/t",
               "ICRA's 2.5 for Indian producers plus 0.1 for hot rolling. No Indian mill's verified figure is public.", "S17"),
    "s_low": (1.0, "Verified intensity of low-carbon rod", "tCO2e/t",
              "ICRA's 0.7 for scrap EAF plus rolling and charge.", "S17"),
    "green_premium_eur": (round(200 / USD_PER_EUR), "Low-carbon rod premium", "EUR/t steel",
                          "Midpoint of USD 190-210/t, quoted for green steel generally, not for Indian EAF rod.", "S18"),
    "discount_rate": (0.12, "Discount rate", "per year", "Judgement for an Indian mid-sized exporter.", None),
    "first_verified_year": (2027, "First year on verified data", "year",
                            "Verifiers registered from Sep 2026, so 2026 imports stay on defaults here.", "S01"),
}


def assumption(name):
    return ASSUMPTIONS[name][0]
