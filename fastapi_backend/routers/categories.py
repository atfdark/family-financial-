from fastapi import APIRouter, HTTPException, status
from typing import List
from models import CategoryResponse, PaymentMethodResponse
from database import get_supabase_client

router = APIRouter()

@router.get("/", response_model=List[CategoryResponse])
async def get_categories():
    """Get all categories"""
    supabase = get_supabase_client()

    try:
        response = supabase.table('categories').select('*').order('name', desc=False).execute()

        if response.data is None:
            return []

        return response.data

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get categories"
        )

@router.get("/payment-methods", response_model=List[PaymentMethodResponse])
async def get_payment_methods():
    """Get all payment methods"""
    supabase = get_supabase_client()

    try:
        response = supabase.table('payment_methods').select('*').order('name', desc=False).execute()

        if response.data is None:
            return []

        return response.data

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get payment methods"
        )