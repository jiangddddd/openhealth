from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.crud import create_order, get_order_detail
from app.deps import get_current_user, get_db
from app.models import User
from app.schemas import ApiResponse, OrderCreateRequest

router = APIRouter(prefix="/api/order", tags=["order"])


@router.post("/create", response_model=ApiResponse)
def create_membership_order(
    payload: OrderCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    data = create_order(
        db=db,
        user=current_user,
        product_type=payload.productType,
        plan_type=payload.planType,
        pay_channel=payload.payChannel,
    )
    return ApiResponse(data=data)


@router.get("/{order_id}", response_model=ApiResponse)
def get_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    order = get_order_detail(db, current_user.id, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    data = {
        "orderId": order.id,
        "orderNo": order.order_no,
        "payStatus": order.pay_status,
        "paidAt": order.paid_at.strftime("%Y-%m-%d %H:%M:%S") if order.paid_at else None,
    }
    return ApiResponse(data=data)
