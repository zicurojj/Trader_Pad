"""
Authentication and Session Management Module
"""
import secrets
from datetime import datetime, timedelta
from typing import Optional, Dict
from fastapi import HTTPException, Header, status

# In-memory session storage
# Structure: {token: {"username": str, "role": str, "user_id": int, "created_at": datetime}}
sessions: Dict[str, dict] = {}

# Session timeout (optional - can be used for cleanup)
SESSION_TIMEOUT_HOURS = 24


def generate_token() -> str:
    """Generate a secure random token for session"""
    return secrets.token_urlsafe(32)


def create_session(user_id: int, username: str, role: str) -> str:
    """
    Create a new session for the user.
    Returns the session token.
    """
    token = generate_token()
    sessions[token] = {
        "user_id": user_id,
        "username": username,
        "role": role,
        "created_at": datetime.now()
    }
    return token


def get_session(token: str) -> Optional[dict]:
    """
    Get session data by token.
    Returns session dict or None if not found.
    """
    return sessions.get(token)


def delete_session(token: str) -> bool:
    """
    Delete a session by token.
    Returns True if successful, False if token not found.
    """
    if token in sessions:
        del sessions[token]
        return True
    return False


def delete_user_sessions(username: str) -> int:
    """
    Delete all sessions for a specific user (used when user is deleted).
    Returns the number of sessions deleted.
    """
    tokens_to_delete = [
        token for token, session in sessions.items()
        if session["username"] == username
    ]
    for token in tokens_to_delete:
        del sessions[token]
    return len(tokens_to_delete)


def verify_token(authorization: Optional[str] = Header(None)) -> dict:
    """
    Dependency to verify authentication token.
    Raises HTTPException if token is invalid or missing.
    Returns session data if valid.
    """
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )

    # Extract token (format: "Bearer <token>")
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header format"
        )

    token = authorization.replace("Bearer ", "")
    session = get_session(token)

    if not session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session"
        )

    return session


def verify_admin(authorization: Optional[str] = Header(None)) -> dict:
    """
    Dependency to verify admin role.
    Raises HTTPException if user is not admin.
    Returns session data if valid.
    """
    session = verify_token(authorization)

    if session["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )

    return session


def cleanup_old_sessions():
    """
    Remove sessions older than SESSION_TIMEOUT_HOURS.
    This can be called periodically if needed.
    """
    now = datetime.now()
    tokens_to_delete = [
        token for token, session in sessions.items()
        if (now - session["created_at"]) > timedelta(hours=SESSION_TIMEOUT_HOURS)
    ]
    for token in tokens_to_delete:
        del sessions[token]
    return len(tokens_to_delete)
