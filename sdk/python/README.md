# envoy-sdk — Python

Official E-NVOY SDK for Python 3.8+. **Zero third-party dependencies** — it uses
only the standard library.

## Install

Not yet published to PyPI — install straight from this repository:

```bash
# from the repo root
pip install ./sdk/python
```

> When a release is published you'll be able to run `pip install envoy-sdk`.

## Quick start

```python
from envoy_sdk import ENovoy

envoy = ENovoy(api_key="fms_YOUR_API_KEY")

result = envoy.emails.send(
    to="user@example.com",
    from_address="hello@yourdomain.com",
    subject="Welcome!",
    html="<h1>Hello!</h1><p>Your account is ready.</p>",
)

print(result.id)  # queued message id
```

## Custom host

```python
envoy = ENovoy(
    api_key="fms_YOUR_API_KEY",
    host="http://78.154.103.19:12083",
)
```

The host also falls back to the `ENVOY_HOST` environment variable, then to the
hosted E-NVOY API.

## Tags & scheduling

```python
result = envoy.emails.send(
    to="user@example.com",
    subject="Scheduled Report",
    html="<p>Your weekly report is ready.</p>",
    tags={"campaign": "weekly-report", "user_id": "123"},
    schedule_ms=3600000,  # 1 hour from now
)
```

## Errors

Non-2xx responses raise `ENovoyError` with `status_code` and `type`:

```python
from envoy_sdk import ENovoy, ENovoyError

try:
    envoy.emails.send(to="user@example.com", subject="Hi", html="<p>Hi</p>")
except ENovoyError as err:
    print(err.status_code, err.type, err)
```

## Smoke test

```bash
ENVOY_API_KEY=fms_… python examples/smoke.py
```
