from pydantic import BaseModel
from typing import List, Optional


class YieldSummaryRow(BaseModel):
    id: int
    county: str
    crop_type: str
    total_expected_yield: float
    total_actual_yield: float
    avg_yield_per_hectare: float
    top_performing: str


class YieldDetailedRow(BaseModel):
    id: int
    reg_no: str
    farmer_name: str
    crop_type: str
    county: str
    farm_size: str
    farm_size_ha: float
    expected_yield: float
    actual_yield: float
    achievement_pct: float
    notes: Optional[str]


class PaginationMeta(BaseModel):
    total: int
    page: int
    page_size: int
    total_pages: int


class DetailedResponse(BaseModel):
    data: List[YieldDetailedRow]
    pagination: PaginationMeta


class SummaryResponse(BaseModel):
    data: List[YieldSummaryRow]