# app/schemas/system_code.py
from pydantic import BaseModel, constr, Field
from typing import Optional

CodeTypeStr = constr(min_length=1, max_length=100)
CodeValueStr = constr(min_length=1, max_length=255)
DescriptionStr = constr(max_length=255)

class SystemCodeCreate(BaseModel):
    code_type: CodeTypeStr = Field(..., example="Sex")
    code_value: CodeValueStr = Field(..., example="Male")
    description: Optional[DescriptionStr] = Field(None, example="Male gender")

class SystemCodeUpdate(BaseModel):
    code_type: Optional[CodeTypeStr] = Field(None, example="Sex")
    code_value: Optional[CodeValueStr] = Field(None, example="Male")
    description: Optional[DescriptionStr] = Field(None, example="Male gender")

class SystemCodeRead(BaseModel):
    id: int
    code_type: str
    code_value: str
    description: Optional[str] = None

    class Config:
        orm_mode = True