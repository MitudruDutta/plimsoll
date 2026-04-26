"""Deprecated shim. Auth backend is now Supabase.

Kept temporarily so older imports do not break during refactor. New code must
import from :mod:`shared.auth.supabase_auth` (or :mod:`shared.auth`) directly.
"""

from shared.auth.supabase_auth import (
    User,
    get_admin_user,
    get_current_user,
    verify_token,
)

__all__ = ["User", "get_admin_user", "get_current_user", "verify_token"]
