from pydantic import BaseModel
from typing import List

class FeatureUsageItem(BaseModel):
    name: str
    count: int
    color: str

class FeatureUsageResponse(BaseModel):
    features: List[FeatureUsageItem]
