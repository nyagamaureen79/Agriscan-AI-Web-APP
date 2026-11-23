from pydantic import BaseModel
from typing import Optional, Dict, Union

class DashboardStatsResponse(BaseModel):
    activeFarmers: Union[int, str]
    carbonEmissions: Union[str, float]
    carbonSequestration: Union[str, float]
    diseaseAlerts: Union[int, str]
    chatbotInteractions: Union[int, str]
    trends: Dict[str, str]
