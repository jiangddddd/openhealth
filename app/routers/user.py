from fastapi import APIRouter, Depends

from app.crud import build_profile_data
from app.deps import get_current_user
from app.models import User
from app.schemas import ApiResponse

router = APIRouter(prefix="/api/user", tags=["user"])


@router.get("/profile", response_model=ApiResponse)
def get_profile(current_user: User = Depends(get_current_user)):
    return ApiResponse(data=build_profile_data(current_user))
