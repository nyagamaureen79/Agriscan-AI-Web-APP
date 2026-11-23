from datetime import datetime

def month_year_pair(dt: datetime):
    if dt.month == 1:
        return 12, dt.year - 1
    return dt.month - 1, dt.year


def calculate_trend(current: float, previous: float) -> str:
    if previous == 0:
        return "-" if current == 0 else "+100%"
    change = ((current - previous) / previous) * 100
    sign = "+" if change >= 0 else ""
    return f"{sign}{round(change, 1)}%"
