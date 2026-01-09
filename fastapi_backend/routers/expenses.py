import logging
from fastapi import APIRouter, HTTPException, status, Query
from typing import List, Optional
from uuid import UUID
from datetime import date
from models import ExpenseCreate, ExpenseResponse
from database import get_supabase_client

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/", response_model=dict)
async def create_expense(
    expense: ExpenseCreate
):
    """Create a new expense"""
    supabase = get_supabase_client()

    try:
        # Validate amount (ensure it is numeric and finite)
        try:
            parsed_amount = float(expense.amount)
            if not (parsed_amount == parsed_amount and parsed_amount != float('inf') and parsed_amount != float('-inf')):
                raise ValueError()
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Amount must be a valid number"
            )

        expense_data = {
            "user_id": "1",
            "amount": parsed_amount,
            "date": str(expense.date),
            "category_id": str(expense.category_id),
            "payment_method_id": str(expense.payment_method_id),
            "description": expense.description or ""
        }

        response = supabase.table('expenses').insert(expense_data).select().execute()

        if not response.data or len(response.data) == 0:
            logger.exception("Insert returned no data: %s", getattr(response, 'error', None))
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Database error"
            )

        return {
            "message": "Expense added successfully",
            "id": str(response.data[0]['id']) if response.data and len(response.data) > 0 else None
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Failed to add expense")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to add expense"
        )

@router.get("/", response_model=List[ExpenseResponse])
async def get_expenses(
    category_id: Optional[UUID] = Query(None, description="Category ID filter"),
    date_from: Optional[date] = Query(None, description="Start date filter"),
    date_to: Optional[date] = Query(None, description="End date filter")
):
    """Get expenses with optional filters"""
    supabase = get_supabase_client()

    try:
        # Build query with joins
        query = supabase.table('expenses').select("""
            *,
            category:categories(name),
            payment_method:payment_methods(name)
        """).eq('user_id', "1")

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
                "payment_method_name": expense.get("payment_method", {}).get("name")
            })

        return transformed_data

    except Exception as e:
        logger.exception("Failed to get expenses")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get expenses"
        )