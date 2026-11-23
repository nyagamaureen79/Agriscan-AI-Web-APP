# financial_entry.py
from pydantic import BaseModel
from datetime import date
from typing import List, Optional

class FinancialStats(BaseModel):
    total_revenue: float
    total_expenses: float
    net_profit: float
    total_transactions: int
    trend_revenue: float = 0.0
    trend_expenses: float = 0.0
    trend_profit: float = 0.0
    trend_transactions: float = 0.0

class MonthlyFinancialData(BaseModel):
    months: list[str]
    revenue: list[float]
    expenses: list[float]
    profit: list[float]


class OutstandingPayments(BaseModel):
    total_outstanding: float
    pending_count: int
 
 
class ForecastData(BaseModel):
    months: List[str]
    revenue: List[float]
    expenses: List[float]
    profit: List[float]
    split_index: int
 
 
class CategoryAmount(BaseModel):
    label: str
    amount: float
 
 
class CashFlowSummary(BaseModel):
    total_inflow: float
    total_outflow: float
    net_cash_flow: float
    income_sources: List[CategoryAmount]
    expense_categories: List[CategoryAmount]