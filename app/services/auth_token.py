from __future__ import annotations

import base64
from datetime import datetime, timedelta, timezone
import hashlib
import hmac
import json
from typing import Any

from app.config import settings


ACCESS_TOKEN_TYPE = "access"
JWT_ALGORITHM = "HS256"


class TokenValidationError(ValueError):
    """访问令牌校验失败时抛出的统一异常。"""


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("ascii").rstrip("=")


def _b64url_decode(data: str) -> bytes:
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(f"{data}{padding}")


def _json_dumps(payload: dict[str, Any]) -> bytes:
    return json.dumps(payload, separators=(",", ":"), ensure_ascii=False).encode("utf-8")


def _get_signing_secret() -> bytes:
    return settings.auth_token_secret.encode("utf-8")


def _build_signature(signing_input: str) -> str:
    signature = hmac.new(
        _get_signing_secret(),
        signing_input.encode("ascii"),
        hashlib.sha256,
    ).digest()
    return _b64url_encode(signature)


def create_access_token(*, user_id: int) -> tuple[str, datetime]:
    """创建带签名和过期时间的访问令牌。"""

    now = datetime.now(timezone.utc)
    expire_at = now + timedelta(minutes=settings.auth_token_expire_minutes)
    header = {
        "alg": JWT_ALGORITHM,
        "typ": "JWT",
    }
    payload = {
        "sub": str(user_id),
        "iat": int(now.timestamp()),
        "exp": int(expire_at.timestamp()),
        "iss": settings.auth_token_issuer,
        "type": ACCESS_TOKEN_TYPE,
    }

    encoded_header = _b64url_encode(_json_dumps(header))
    encoded_payload = _b64url_encode(_json_dumps(payload))
    signing_input = f"{encoded_header}.{encoded_payload}"
    signature = _build_signature(signing_input)
    token = f"{signing_input}.{signature}"
    return token, expire_at


def decode_access_token(token: str) -> dict[str, Any]:
    """校验访问令牌并返回 payload。"""

    parts = token.split(".")
    if len(parts) != 3:
        raise TokenValidationError("Invalid token")

    encoded_header, encoded_payload, encoded_signature = parts
    signing_input = f"{encoded_header}.{encoded_payload}"
    expected_signature = _build_signature(signing_input)
    if not hmac.compare_digest(encoded_signature, expected_signature):
        raise TokenValidationError("Invalid token")

    try:
        header = json.loads(_b64url_decode(encoded_header).decode("utf-8"))
        payload = json.loads(_b64url_decode(encoded_payload).decode("utf-8"))
    except (ValueError, json.JSONDecodeError, UnicodeDecodeError) as exc:
        raise TokenValidationError("Invalid token") from exc

    if header.get("alg") != JWT_ALGORITHM or header.get("typ") != "JWT":
        raise TokenValidationError("Invalid token")

    if payload.get("type") != ACCESS_TOKEN_TYPE:
        raise TokenValidationError("Invalid token")

    if payload.get("iss") != settings.auth_token_issuer:
        raise TokenValidationError("Invalid token")

    try:
        exp = int(payload.get("exp"))
        user_id = int(payload.get("sub"))
    except (TypeError, ValueError) as exc:
        raise TokenValidationError("Invalid token") from exc

    if exp <= int(datetime.now(timezone.utc).timestamp()):
        raise TokenValidationError("Token expired")

    payload["user_id"] = user_id
    return payload
