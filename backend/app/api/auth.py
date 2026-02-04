from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta, datetime
from typing import Any, List

from app.core import security
from app.core.config import settings
from app.api import deps
from app.schemas.user import UserCreate, UserResponse
from app.schemas.auth import Token, Login, RefreshToken, SessionResponse
from app.models.user import User
from app.models.session import Session as UserSession

router = APIRouter()


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(
    user_in: UserCreate,
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    Registrar un nuevo usuario. Por defecto se asigna el rol con ID 5.
    """
    user = db.query(User).filter(User.email == user_in.email).first()
    if user:
        raise HTTPException(
            status_code=400,
            detail="The user with this email already exists in the system",
        )
    
    # Rol automático 5 según requerimiento
    # Asumimos que el rol 5 existe (creado por los seeds)
    role_id = 5
    
    user = User(
        email=user_in.email,
        full_name=user_in.full_name,
        password_hash=security.get_password_hash(user_in.password),
        role_id=role_id,
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.post("/login", response_model=Token)
def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    OAuth2 compatible token login, get an access token for future requests.
    """
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not security.verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
        
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    refresh_token = security.create_refresh_token(user.id)
    refresh_token_hash = security.get_password_hash(refresh_token) # Usamos el mismo hasher para guardar el token

    # Crear sesión
    user_agent = request.headers.get("user-agent", "Unknown")
    client_ip = request.client.host if request.client else "Unknown"
    
    expires_at = datetime.utcnow() + timedelta(minutes=settings.REFRESH_TOKEN_EXPIRE_MINUTES)
    
    session = UserSession(
        user_id=user.id,
        refresh_token_hash=refresh_token_hash,
        device_info=user_agent[:255], # Limitar longitud
        ip_address=client_ip,
        expires_at=expires_at
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    
    access_token = security.create_access_token(
        user.id, expires_delta=access_token_expires, session_id=session.id
    )
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
    }

@router.post("/refresh", response_model=Token)
def refresh_token(
    token_in: RefreshToken,
    db: Session = Depends(deps.get_db),
    request: Request = None
) -> Any:
    """
    Refresh access token.
    """
    payload = security.verify_token(token_in.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )
        
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token subject",
        )
        
    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")

    # Validar sesión
    # Buscamos todas las sesiones activas del usuario y verificamos el hash
    # Esto es ineficiente si hay muchas sesiones, pero seguro.
    # Alternativamente, si tuviéramos el session_id en el token, sería directo.
    # Como no cambiamos el payload del token en el paso anterior, iteramos.
    # TODO: En el futuro incluir session_id en el payload del refresh token.
    
    active_sessions = db.query(UserSession).filter(
        UserSession.user_id == user.id,
        UserSession.revoked_at.is_(None),
        UserSession.expires_at > datetime.utcnow()
    ).all()
    
    valid_session = None
    for session in active_sessions:
        if security.verify_password(token_in.refresh_token, session.refresh_token_hash):
            valid_session = session
            break
            
    if not valid_session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or revoked",
        )

    # Actualizar última actividad
    valid_session.last_active_at = datetime.utcnow()
    
    # Rotar tokens
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        user.id, expires_delta=access_token_expires, session_id=valid_session.id
    )
    
    new_refresh_token = security.create_refresh_token(user.id)
    valid_session.refresh_token_hash = security.get_password_hash(new_refresh_token)
    valid_session.expires_at = datetime.utcnow() + timedelta(minutes=settings.REFRESH_TOKEN_EXPIRE_MINUTES)
    
    if request:
        valid_session.ip_address = request.client.host if request.client else valid_session.ip_address
        
    db.commit()
    
    return {
        "access_token": access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer",
    }

@router.post("/logout", status_code=status.HTTP_200_OK)
def logout(
    token_in: RefreshToken,
    db: Session = Depends(deps.get_db),
) -> Any:
    """
    Revoke a refresh token (Logout).
    """
    payload = security.verify_token(token_in.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )
        
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token subject",
        )
        
    # Find the session
    active_sessions = db.query(UserSession).filter(
        UserSession.user_id == int(user_id),
        UserSession.revoked_at.is_(None),
        UserSession.expires_at > datetime.utcnow()
    ).all()
    
    valid_session = None
    for session in active_sessions:
        if security.verify_password(token_in.refresh_token, session.refresh_token_hash):
            valid_session = session
            break
            
    if valid_session:
        valid_session.revoked_at = datetime.utcnow()
        db.commit()
        
    return {"msg": "Successfully logged out"}

@router.get("/sessions", response_model=List[SessionResponse])
def read_sessions(
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(deps.get_db),
) -> Any:
    """
    List active sessions for the current user.
    """
    sessions = db.query(UserSession).filter(
        UserSession.user_id == current_user.id,
        UserSession.revoked_at.is_(None),
        UserSession.expires_at > datetime.utcnow()
    ).all()
    return sessions

@router.get("/me", response_model=UserResponse)
def read_users_me(
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Get current user.
    """
    return current_user
