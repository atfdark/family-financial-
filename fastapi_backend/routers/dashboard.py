from fastapi import APIRouter, HTTPException, status, Query
from typing import List, Optional
from datetime import datetime
from models import UserInfo, MonthlyDashboardResponse, YearlyDashboardResponse
from database import get_supabase_client
from middleware.auth import get_current_user

router = APIRouter()

@router.get("/users", response_model=List[UserInfo])
async def get_users(current_user: dict = get_current_user):
    """Get all users (requires authentication)"""
    supabase = get_supabase_client()

    try:
        response = supabase.table('users').select('id, name, email').order('name', desc=False).execute()

        if response.data is None:
            return []

        return response.data

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get users"
        )

@router.get("/{user_id}/monthly", response_model=MonthlyDashboardResponse)
async def get_monthly_dashboard(
    user_id: str,
    year: Optional[int] = Query(None, description="Year for dashboard"),
    month: Optional[int] = Query(None, description="Month for dashboard"),
    current_user: dict = get_current_user
):
    """Get monthly dashboard data"""
    if str(current_user["id"]) != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )

    supabase = get_supabase_client()

    try:
        # Get user info
        user_response = supabase.table('users').select('id, name').eq('id', user_id).execute()
        if not user_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        user = user_response.data[0]

        # Default to current year/month
        current_year = datetime.utcnow().year
        current_month = datetime.utcnow().month
        target_year = year or current_year
        target_month = month or current_month

        date_filter = f"{target_year}-{str(target_month).zfill(2)}"

        # Get total spent
        total_response = supabase.table('expenses').select('amount').eq('user_id', user_id).like('date', f"{date_filter}%").execute()
        total_spent = sum(float(expense['amount']) for expense in (total_response.data or []))

        # Get top categories
        top_categories = supabase.rpc('get_top_categories_monthly', {
            'p_user_id': user_id,
            'p_year': target_year,
            'p_month': target_month,
            'p_limit': 5
        }).execute()

        # Get category breakdown
        category_breakdown = supabase.rpc('get_category_breakdown_monthly', {
            'p_user_id': user_id,
            'p_year': target_year,
            'p_month': target_month
        }).execute()

        return MonthlyDashboardResponse(
            user=UserInfo(id=user['id'], name=user['name'], email=""),  # Email not needed
            period={
                "type": "monthly",
                "year": target_year,
                "month": target_month
            },
            total_spent=total_spent,
            top_categories=top_categories.data or [],
            category_breakdown=category_breakdown.data or []
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get monthly dashboard"
        )

@router.get("/{user_id}/yearly", response_model=YearlyDashboardResponse)
async def get_yearly_dashboard(
    user_id: str,
    year: Optional[int] = Query(None, description="Year for dashboard"),
    current_user: dict = get_current_user
):
    """Get yearly dashboard data"""
    if str(current_user["id"]) != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )

    supabase = get_supabase_client()

    try:
        # Get user info
        user_response = supabase.table('users').select('id, name').eq('id', user_id).execute()
        if not user_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        user = user_response.data[0]

        # Default to current year
        current_year = datetime.utcnow().year
        target_year = year or current_year

        # Get total spent
        total_response = supabase.table('expenses').select('amount').eq('user_id', user_id).like('date', f"{target_year}%").execute()
        total_spent = sum(float(expense['amount']) for expense in (total_response.data or []))

        # Get monthly trends
        monthly_trends = supabase.rpc('get_monthly_trends_yearly', {
            'p_user_id': user_id,
            'p_year': target_year
        }).execute()

        # Get top categories
        top_categories = supabase.rpc('get_top_categories_yearly', {
            'p_user_id': user_id,
            'p_year': target_year,
            'p_limit': 5
        }).execute()

        # Get category breakdown
        category_breakdown = supabase.rpc('get_category_breakdown_yearly', {
            'p_user_id': user_id,
            'p_year': target_year
        }).execute()

        # Build monthly data array
        monthly_data = []
        trends_dict = {trend['month']: float(trend['amount']) for trend in (monthly_trends.data or [])}

        for m in range(1, 13):
            month_str = str(m).zfill(2)
            monthly_data.append({
                "month": m,
                "month_name": datetime(target_year, m, 1).strftime('%B'),
                "amount": trends_dict.get(month_str, 0)
            })

        return YearlyDashboardResponse(
            user=UserInfo(id=user['id'], name=user['name'], email=""),  # Email not needed
            period={
                "type": "yearly",
                "year": target_year
            },
            total_spent=total_spent,
            monthly_trends=monthly_data,
            top_categories=top_categories.data or [],
            category_breakdown=category_breakdown.data or []
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get yearly dashboard"
        )