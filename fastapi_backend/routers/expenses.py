from fastapi import APIRouter, HTTPException, status, Query
from typing import List, Optional
from uuid import UUID
from datetime import date
from models import ExpenseCreate, ExpenseResponse
from database import get_supabase_client
from middleware.auth import get_current_user

router = APIRouter()

@router.post("/", response_model=dict)
async def create_expense(
    expense: ExpenseCreate,
    current_user: dict = get_current_user
):
    """Create a new expense"""
    supabase = get_supabase_client()

    try:
        expense_data = {
            "user_id": current_user["id"],
            "amount": float(expense.amount),
            "date": str(expense.date),
            "category_id": str(expense.category_id),
            "payment_method_id": str(expense.payment_method_id),
            "description": expense.description or ""
        }

        response = supabase.table('expenses').insert(expense_data).select().execute()

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Database error"
            )

        return {
            "message": "Expense added successfully",
            "id": str(response.data[0]['id'])
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to add expense"
        )

@router.get("/", response_model=List[ExpenseResponse])
async def get_expenses(
    user_id: str = Query(..., description="User ID to filter expenses"),
    category_id: Optional[UUID] = Query(None, description="Category ID filter"),
    date_from: Optional[date] = Query(None, description="Start date filter"),
    date_to: Optional[date] = Query(None, description="End date filter"),
    current_user: dict = get_current_user
):
    """Get expenses with optional filters"""
    # Check if user can access this data
    if str(current_user["id"]) != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )

    supabase = get_supabase_client()

    try:
        # Build query with joins
        query = supabase.table('expenses').select("""
            *,
            category:categories(name),
            payment_method:payment_methods(name),
            user:users(name)
        """).eq('user_id', user_id)

        if category_id:
            query = query.eq('category_id', str(category_id))
        if date_from:
            query = query.gte('date', str(date_from))
        if date_to:
            query = query.lte('date', str(date_to))

        response = query.execute()

        if response.data is None:
            return []

        # Transform data to match expected format
        transformed_data = []
        for expense in response.data:
            transformed_data.append({
                **expense,
                "category_name": expense.get("category", {}).get("name"),
                "payment_method_name": expense.get("payment_method", {}).get("name"),
                "user_name": expense.get("user", {}).get("name")
            })

        return transformed_data

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get expenses"
        )