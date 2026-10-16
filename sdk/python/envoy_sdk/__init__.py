"""E-NVOY — official Python SDK for the E-NVOY email API."""

from .client import ENovoy, ENovoyError, EmailsResource, SendEmailResult

__all__ = ["ENovoy", "ENovoyError", "EmailsResource", "SendEmailResult"]
__version__ = "0.1.0"
