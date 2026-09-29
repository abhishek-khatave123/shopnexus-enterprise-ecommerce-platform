from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.models.user import User
from app.models.address import Address
from app.schemas.user import UserOut, UserUpdateRequest, AddressCreate, AddressOut

router = APIRouter(prefix="/api/users", tags=["Users"])


def _serialize_user(user: User) -> UserOut:
    # Built manually rather than UserOut.model_validate(user): the ORM
    # relationship `user.role` is a Role object, not the plain string that
    # the UserOut.role field expects, so a direct from_attributes validation
    # would fail.
    return UserOut(
        id=user.id,
        name=user.name,
        email=user.email,
        phone=user.phone,
        role=user.role.name,
        is_active=user.is_active,
        created_at=user.created_at,
    )


@router.get("/me", response_model=UserOut, summary="Get my profile")
def get_my_profile(current_user: User = Depends(get_current_user)):
    return _serialize_user(current_user)


@router.put("/me", response_model=UserOut, summary="Update my profile")
def update_my_profile(payload: UserUpdateRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(current_user, field, value)
    db.commit()
    db.refresh(current_user)
    return _serialize_user(current_user)


@router.get("/me/addresses", response_model=list[AddressOut], summary="List my saved addresses")
def list_my_addresses(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Address).filter(Address.user_id == current_user.id).all()


@router.post("/me/addresses", response_model=AddressOut, status_code=201, summary="Add a new address")
def add_address(payload: AddressCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    address = Address(user_id=current_user.id, **payload.model_dump())
    db.add(address)
    db.commit()
    db.refresh(address)
    return address


@router.delete("/me/addresses/{address_id}", summary="Delete an address")
def delete_address(address_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    address = db.query(Address).filter(Address.id == address_id, Address.user_id == current_user.id).first()
    if not address:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Address not found")
    db.delete(address)
    db.commit()
    return {"success": True, "message": "Address deleted"}
