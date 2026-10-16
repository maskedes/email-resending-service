"""Smoke test for the E-NVOY Python SDK — sends one real message.

Usage:
    ENVOY_API_KEY=fms_... [ENVOY_HOST=http://...] [TEST_TO=you@example.com] \
        python examples/smoke.py
"""

import os

from envoy_sdk import ENovoy, ENovoyError


def main() -> None:
    api_key = os.environ.get("ENVOY_API_KEY")
    if not api_key:
        raise SystemExit("Missing ENVOY_API_KEY.")

    envoy = ENovoy(api_key=api_key, host=os.environ.get("ENVOY_HOST"))

    try:
        result = envoy.emails.send(
            to=os.environ.get("TEST_TO", "delivered@resend.dev"),
            from_address=os.environ.get("TEST_FROM") or None,
            subject="E-NVOY Python SDK smoke test",
            html="<h1>Hello from the Python SDK</h1>",
            tags={"source": "sdk-smoke"},
        )
    except ENovoyError as err:
        print("API error:", err.status_code, err.type, err)
        raise SystemExit(2)

    print("OK — queued message:", result)


if __name__ == "__main__":
    main()
