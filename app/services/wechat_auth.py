from __future__ import annotations

import hashlib
import json
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import urlopen

from app.config import settings


WECHAT_CODE2SESSION_URL = "https://api.weixin.qq.com/sns/jscode2session"


def _build_mock_session(code: str) -> dict[str, str]:
    digest = hashlib.sha256(code.encode("utf-8")).hexdigest()
    return {
        "openid": f"mock_openid_{digest[:24]}",
        "unionid": f"mock_unionid_{digest[24:48]}",
        "session_key": f"mock_session_key_{digest[:32]}",
    }


def exchange_wechat_code(code: str) -> dict[str, str | None]:
    code = code.strip()
    if not code:
      raise ValueError("wechat login code is required")

    if not settings.wechat_mini_appid or not settings.wechat_mini_secret:
        return _build_mock_session(code)

    query = urlencode(
        {
            "appid": settings.wechat_mini_appid,
            "secret": settings.wechat_mini_secret,
            "js_code": code,
            "grant_type": "authorization_code",
        }
    )
    request_url = f"{WECHAT_CODE2SESSION_URL}?{query}"

    try:
        with urlopen(request_url, timeout=8) as response:
            payload: dict[str, Any] = json.loads(response.read().decode("utf-8"))
    except (HTTPError, URLError) as exc:
        raise RuntimeError("wechat code exchange failed") from exc

    if payload.get("errcode"):
        raise RuntimeError(payload.get("errmsg") or "wechat code exchange failed")

    return {
        "openid": payload.get("openid"),
        "unionid": payload.get("unionid"),
        "session_key": payload.get("session_key"),
    }
