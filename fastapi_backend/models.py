from __future__ import annotations

from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from uuid import UUID
from datetime import date as Date, datetime
from decimal import Decimal

# Authentication Models
class LoginRequest(BaseModel):
    email: EmailStr = Field(..., description="User email")
    password: str = Field(..., description="User password")

class RegisterRequest(BaseModel):
    email: EmailStr = Field(..., description="User email")
    username: Optional[str] = Field(None, description="Optional display name")
    password: str = Field(..., description="User password")

class TokenResponse(BaseModel):
    message: str
    token: str
    user: dict

class UserResponse(BaseModel):
    user: dict

# Expense Models
class ExpenseCreate(BaseModel):
    amount: Decimal = Field(..., description="Expense amount")
    date: Date = Field(..., description="Expense date")
    category_id: UUID = Field(..., description="Category UUID")
    payment_method_id: UUID = Field(..., description="Payment method UUID")
    description: Optional[str] = Field("", description="Optional description")

class ExpenseResponse(BaseModel):
    id: UUID
    user_id: UUID
    amount: Decimal
    date: Date
    category_id: Optional[UUID]
    payment_method_id: Optional[UUID]
    description: Optional[str]
    created_at: datetime
    updated_at: datetime
    category_name: Optional[str]
    payment_method_name: Optional[str]
    user_name: Optional[str]

# Category and Payment Method Models
class CategoryResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str]
    created_at: str
    updated_at: str

class PaymentMethodResponse(BaseModel):
    id: UUID
    name: str
    created_at: str
    updated_at: str

# Dashboard Models
class UserInfo(BaseModel):
    id: UUID
    name: str
    email: str

class MonthlyDashboardResponse(BaseModel):
    user: UserInfo
    period: dict
    total_spent: float
    top_categories: List[dict]
    category_breakdown: List[dict]

class YearlyDashboardResponse(BaseModel):
    user: UserInfo
    period: dict
    total_spent: float
    monthly_trends: List[dict]
    top_categories: List[dict]
    category_breakdown: List[dict]

# Error Models
class ErrorResponse(BaseModel):
    error: str