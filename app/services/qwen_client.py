from __future__ import annotations

import json
import logging
from typing import Any

from openai import OpenAI

from app.config import settings
from app.database import SessionLocal
from app.models import PromptLog

logger = logging.getLogger(__name__)


class QwenClient:
    """Qwen 调用封装层。

    职责：
    1. 统一创建 OpenAI 兼容客户端
    2. 输出请求/响应日志
    3. 记录 prompt_logs，便于排查模型调用问题
    """

    def __init__(self) -> None:
        # 是否启用真实 Qwen 调用；若未配置 key，则回退 mock。
        self.enabled = bool(settings.qwen_api_key)
        # 当前使用的模型名，例如 qwen-plus。
        self.model = settings.qwen_model
        self._client = None

        if self.enabled:
            self._client = OpenAI(
                api_key=settings.qwen_api_key,
                base_url=settings.qwen_base_url,
            )

    def _write_prompt_log(
        self,
        *,
        user_id: int | None,
        business_type: str,
        prompt_version: str,
        input_payload: dict[str, Any],
        output_payload: str,
        status: str,
    ) -> None:
        """把一次模型调用的入参、出参和状态写入 prompt_logs。"""

        session = SessionLocal()
        try:
            session.add(
                PromptLog(
                    user_id=user_id,
                    business_type=business_type,
                    prompt_version=prompt_version,
                    input_payload=input_payload,
                    output_payload=output_payload,
                    status=status,
                )
            )
            session.commit()
        except Exception:
            session.rollback()
            logger.exception("Failed to write prompt log", extra={"business_type": business_type})
        finally:
            session.close()

    def chat_json(
        self,
        *,
        business_type: str,
        system_prompt: str,
        user_prompt: str,
        user_id: int | None = None,
        prompt_version: str = "v1",
    ) -> dict[str, Any]:
        """请求模型并强制返回 JSON 结构。

        适用于标题、标签、基础解梦、追问问题、追问解析、运势等结构化输出场景。
        """

        input_payload = {
            "model": self.model,
            "system_prompt": system_prompt,
            "user_prompt": user_prompt,
            "response_type": "json",
        }
        logger.info("Qwen request: %s", json.dumps({"business_type": business_type, **input_payload}, ensure_ascii=False))

        if not self.enabled or self._client is None:
            output_payload = "Qwen API key is not configured"
            logger.warning("Qwen disabled for %s", business_type)
            self._write_prompt_log(
                user_id=user_id,
                business_type=business_type,
                prompt_version=prompt_version,
                input_payload=input_payload,
                output_payload=output_payload,
                status="disabled",
            )
            raise RuntimeError(output_payload)

        try:
            response = self._client.chat.completions.create(
                model=self.model,
                temperature=0.7,
                response_format={"type": "json_object"},
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
            )
            content = response.choices[0].message.content or "{}"
            logger.info("Qwen response [%s]: %s", business_type, content)
            self._write_prompt_log(
                user_id=user_id,
                business_type=business_type,
                prompt_version=prompt_version,
                input_payload=input_payload,
                output_payload=content,
                status="success",
            )
            return json.loads(content)
        except Exception as exc:
            output_payload = str(exc)
            logger.exception("Qwen request failed for %s", business_type)
            self._write_prompt_log(
                user_id=user_id,
                business_type=business_type,
                prompt_version=prompt_version,
                input_payload=input_payload,
                output_payload=output_payload,
                status="failed",
            )
            raise

    def chat_text(
        self,
        *,
        business_type: str,
        system_prompt: str,
        user_prompt: str,
        user_id: int | None = None,
        prompt_version: str = "v1",
    ) -> str:
        """请求模型并返回纯文本结果。

        适用于深度解读这类结构固定但最终仍以文本形式展示的场景。
        """

        input_payload = {
            "model": self.model,
            "system_prompt": system_prompt,
            "user_prompt": user_prompt,
            "response_type": "text",
        }
        logger.info("Qwen request: %s", json.dumps({"business_type": business_type, **input_payload}, ensure_ascii=False))

        if not self.enabled or self._client is None:
            output_payload = "Qwen API key is not configured"
            logger.warning("Qwen disabled for %s", business_type)
            self._write_prompt_log(
                user_id=user_id,
                business_type=business_type,
                prompt_version=prompt_version,
                input_payload=input_payload,
                output_payload=output_payload,
                status="disabled",
            )
            raise RuntimeError(output_payload)

        try:
            response = self._client.chat.completions.create(
                model=self.model,
                temperature=0.7,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
            )
            content = (response.choices[0].message.content or "").strip()
            logger.info("Qwen response [%s]: %s", business_type, content)
            self._write_prompt_log(
                user_id=user_id,
                business_type=business_type,
                prompt_version=prompt_version,
                input_payload=input_payload,
                output_payload=content,
                status="success",
            )
            return content
        except Exception as exc:
            output_payload = str(exc)
            logger.exception("Qwen request failed for %s", business_type)
            self._write_prompt_log(
                user_id=user_id,
                business_type=business_type,
                prompt_version=prompt_version,
                input_payload=input_payload,
                output_payload=output_payload,
                status="failed",
            )
            raise


qwen_client = QwenClient()
