"""唯一对外 AI 客户端：透传 POST {AGENT_BASE_URL}/agent/v1/invoke。"""

from __future__ import annotations

from typing import Any, Literal

import httpx

from app.config import get_settings

# LLM 调用可能较慢；连接失败/超时统一映射为 agent_unavailable
DEFAULT_TIMEOUT = httpx.Timeout(60.0, connect=5.0)
HEALTH_TIMEOUT = httpx.Timeout(2.0, connect=1.0)


class AgentUnavailableError(Exception):
    """Agent 不可达（连接失败、超时等）。"""


class AgentHttpError(Exception):
    """Agent 返回了 HTTP 错误状态（服务可达但业务拒绝）。"""

    def __init__(self, *, status_code: int, body: Any) -> None:
        self.status_code = status_code
        self.body = body
        super().__init__(f"agent http {status_code}")


def probe_health() -> Literal["up", "down"]:
    """GET {AGENT_BASE_URL}/health → up|down。"""
    base = get_settings().agent_base_url.rstrip("/")
    try:
        with httpx.Client(timeout=HEALTH_TIMEOUT, trust_env=False) as client:
            resp = client.get(f"{base}/health")
            if resp.status_code == 200:
                return "up"
    except httpx.HTTPError:
        pass
    return "down"


def invoke(
    payload: dict[str, Any], *, timeout: httpx.Timeout | None = None
) -> dict[str, Any]:
    """转发请求体到 Agent invoke，原样返回 JSON。

    不解读 status / user_options，不做智能分支。
    仅网络层失败转为 AgentUnavailableError。
    """
    base = get_settings().agent_base_url.rstrip("/")
    url = f"{base}/agent/v1/invoke"
    try:
        # trust_env=False：避免系统代理把本机 Agent 请求拐走
        with httpx.Client(
            timeout=timeout or DEFAULT_TIMEOUT, trust_env=False
        ) as client:
            resp = client.post(url, json=payload)
    except (httpx.ConnectError, httpx.TimeoutException, httpx.NetworkError) as exc:
        raise AgentUnavailableError("智能服务暂不可用") from exc
    except httpx.HTTPError as exc:
        raise AgentUnavailableError("智能服务暂不可用") from exc

    try:
        data = resp.json()
    except ValueError:
        data = {"raw": resp.text}

    if resp.status_code >= 400:
        raise AgentHttpError(status_code=resp.status_code, body=data)

    if not isinstance(data, dict):
        return {"data": data}
    return data
