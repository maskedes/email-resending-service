"""Core client for the E-NVOY Python SDK.

Zero third-party dependencies — uses only the standard library.

Example
-------
>>> from envoy_sdk import ENovoy
>>> envoy = ENovoy(api_key="fms_YOUR_API_KEY")
>>> result = envoy.emails.send(
...     to="user@example.com",
...     from_address="hello@yourdomain.com",
...     subject="Welcome!",
...     html="<h1>Hello!</h1>",
... )
>>> print(result.id)
"""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Union

#: Default API host. Overridable per-client via ``host`` or the ``ENVOY_HOST`` env var.
DEFAULT_HOST = os.environ.get("ENVOY_HOST", "http://78.154.103.19:12083")


class ENovoyError(Exception):
    """Raised for any error returned by the E-NVOY API or the network layer."""

    def __init__(self, message: str, status_code: int = 0, type: Optional[str] = None) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.type = type


@dataclass
class SendEmailResult:
    """A queued message returned by :meth:`EmailsResource.send`."""

    id: str
    from_: str
    to: List[str]
    subject: str
    status: str
    created_at: str
    raw: Dict[str, Any] = field(default_factory=dict)


class EmailsResource:
    """Reachable as ``envoy.emails``."""

    def __init__(self, client: "ENovoy") -> None:
        self._client = client

    def send(
        self,
        *,
        to: Union[str, List[str]],
        subject: str,
        html: Optional[str] = None,
        text: Optional[str] = None,
        from_address: Optional[str] = None,
        reply_to: Optional[str] = None,
        tags: Optional[Dict[str, str]] = None,
        schedule_ms: Optional[int] = None,
    ) -> SendEmailResult:
        """Send a single email and return the queued message.

        At least one of ``html`` or ``text`` is required. ``from_address`` maps
        to the API's ``from`` field and ``schedule_ms`` maps to ``scheduleInMs``.
        """
        body: Dict[str, Any] = {"to": to, "subject": subject}
        if html is not None:
            body["html"] = html
        if text is not None:
            body["text"] = text
        if from_address is not None:
            body["from"] = from_address
        if reply_to is not None:
            body["reply_to"] = reply_to
        if tags is not None:
            body["tags"] = tags
        if schedule_ms is not None:
            body["scheduleInMs"] = schedule_ms

        data = self._client._request("POST", "/api/emails/send", body)

        to_value = data.get("to")
        if isinstance(to_value, list):
            to_list: List[str] = [str(item) for item in to_value]
        elif to_value:
            to_list = [str(to_value)]
        else:
            to_list = []

        return SendEmailResult(
            id=str(data.get("id", "")),
            from_=str(data.get("from", "")),
            to=to_list,
            subject=str(data.get("subject", "")),
            status=str(data.get("status", "")),
            created_at=str(data.get("created_at", "")),
            raw=data,
        )


class ENovoy:
    """The unified E-NVOY client. One instance per API key."""

    def __init__(self, api_key: str, host: Optional[str] = None) -> None:
        if not api_key:
            raise ValueError("ENovoy: `api_key` is required.")
        self.api_key = api_key
        self.host = (host or DEFAULT_HOST).rstrip("/")
        self.emails = EmailsResource(self)

    def _request(self, method: str, path: str, body: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        url = self.host + path
        data = json.dumps(body).encode("utf-8") if body is not None else None
        request = urllib.request.Request(url, data=data, method=method)
        request.add_header("Content-Type", "application/json")
        request.add_header("x-api-key", self.api_key)

        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                raw = response.read().decode("utf-8")
                return json.loads(raw) if raw else {}
        except urllib.error.HTTPError as err:
            raw = err.read().decode("utf-8", "replace")
            try:
                parsed = json.loads(raw)
            except ValueError:
                parsed = {}
            error = parsed.get("error", {}) if isinstance(parsed, dict) else {}
            message = error.get("message") or f"E-NVOY request failed with status {err.code}."
            raise ENovoyError(message, err.code, error.get("type")) from None
        except urllib.error.URLError as err:
            raise ENovoyError(f"E-NVOY request failed: {err.reason}") from None
