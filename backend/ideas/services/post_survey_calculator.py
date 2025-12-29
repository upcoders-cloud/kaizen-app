from decimal import Decimal, ROUND_HALF_UP

HOURLY_RATE = Decimal("60.00")
UNIT_MULTIPLIERS = {
    "DAY": Decimal("22"),
    "WEEK": Decimal("4"),
    "MONTH": Decimal("1"),
}


def calculate_survey_results(frequency_value, frequency_unit, affected_people, time_lost_minutes):
    """
    Returns estimated time (hours) and financial savings for a given survey input.
    Adjust HOURLY_RATE or UNIT_MULTIPLIERS as needed.
    """
    multiplier = UNIT_MULTIPLIERS.get(frequency_unit, Decimal("1"))

    total_minutes = (
        Decimal(str(frequency_value))
        * Decimal(str(affected_people))
        * Decimal(str(time_lost_minutes))
        * multiplier
    )
    hours = (total_minutes / Decimal("60")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    financial = (hours * HOURLY_RATE).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    return {
        "estimated_time_savings_hours": float(hours),
        "estimated_financial_savings": financial,
    }
