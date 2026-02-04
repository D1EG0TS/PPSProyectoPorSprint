from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from app.core.security import verify_token
from app.db.connection import SessionLocal
from app.models.session import Session as UserSession
from datetime import datetime, timezone

class ActiveSessionMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Process request
        response = await call_next(request)
        
        # Check Authorization header
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            try:
                payload = verify_token(token)
                if payload and payload.get("type") == "access":
                    session_id = payload.get("session_id")
                    if session_id:
                        # Update session activity
                        db = SessionLocal()
                        try:
                            # Update timestamp
                            db.query(UserSession).filter(UserSession.id == session_id).update(
                                {"last_active_at": datetime.now(timezone.utc).replace(tzinfo=None)}
                            )
                            db.commit()
                        except Exception:
                            pass
                        finally:
                            db.close()
            except Exception:
                pass # Ignore errors to avoid blocking response
                
        return response
