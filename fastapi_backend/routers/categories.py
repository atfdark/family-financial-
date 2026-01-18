import logging
from fastapi import APIRouter, HTTPException, status, Request
from typing import List
from models import CategoryResponse, PaymentMethodResponse
from database import get_supabase_client

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/", response_model=List[CategoryResponse])
async def get_categories(request: Request):
    """Get all categories"""
    supabase = get_supabase_client(request)
    logger.info(f"Supabase client type: {type(supabase)}")

    try:
        response = supabase.table('categories').select('*').order('name', desc=False).execute()

        if response.data is None:
            return []

        return response.data

    except Exception as e:
        logger.exception("Failed to get categories")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get categories"
        )

