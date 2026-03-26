from fastapi import APIRouter, Depends

from app.crud import get_membership_info
from app.deps import get_current_user
from app.models import User
from app.schemas import ApiResponse

router = APIRouter(prefix="/api/membership", tags=["membership"])


@router.get("/info", response_model=ApiResponse)
def membership_info(current_user: User = Depends(get_current_user)):
    return ApiResponse(data=get_membership_info(current_user))
