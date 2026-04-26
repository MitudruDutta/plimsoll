#!/usr/bin/env python
"""Static audit for FastAPI routes exposed without authentication.

This intentionally avoids importing the app so it can run in CI before the
full backend dependency stack is installed. It recognizes the local route
patterns used in this repo: ``app.<method>()`` in ``main.py`` and
``router.<method>()`` in modules with ``router = APIRouter(...)``.
"""

from __future__ import annotations

import ast
from dataclasses import dataclass
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[1]
ROUTE_FILES = [BACKEND_DIR / "main.py", *sorted((BACKEND_DIR / "modules").rglob("*_routes.py"))]

PUBLIC_PATHS = {
    "/",
    "/healthz",
    "/readyz",
}

SIGNED_WEBSOCKET_PATHS = {
    "/api/demo/ws",
}

AUTH_NAMES = {
    "get_current_user",
    "get_admin_user",
}

HTTP_METHODS = {
    "get",
    "post",
    "put",
    "patch",
    "delete",
    "options",
    "head",
    "websocket",
}


@dataclass(frozen=True)
class RouteFinding:
    method: str
    path: str
    file: Path
    line: int


def _name(node: ast.AST) -> str:
    if isinstance(node, ast.Name):
        return node.id
    if isinstance(node, ast.Attribute):
        return node.attr
    if isinstance(node, ast.Call):
        return _name(node.func)
    return ""


def _has_auth_dependency(node: ast.AST) -> bool:
    if isinstance(node, ast.Call):
        call_name = _name(node.func)
        if call_name in AUTH_NAMES:
            return True
        return any(_has_auth_dependency(arg) for arg in node.args) or any(
            _has_auth_dependency(kw.value) for kw in node.keywords
        )
    if isinstance(node, (ast.List, ast.Tuple)):
        return any(_has_auth_dependency(elt) for elt in node.elts)
    return _name(node) in AUTH_NAMES


def _literal_string(node: ast.AST) -> str | None:
    if isinstance(node, ast.Constant) and isinstance(node.value, str):
        return node.value
    return None


def _join_paths(prefix: str, route_path: str) -> str:
    if route_path == "/":
        return prefix or "/"
    return f"{prefix.rstrip('/')}/{route_path.lstrip('/')}"


def _router_metadata(tree: ast.Module) -> dict[str, tuple[str, bool]]:
    routers: dict[str, tuple[str, bool]] = {}
    for node in tree.body:
        if not isinstance(node, ast.Assign):
            continue
        if not isinstance(node.value, ast.Call) or _name(node.value.func) != "APIRouter":
            continue

        prefix = ""
        authed = False
        for kw in node.value.keywords:
            if kw.arg == "prefix":
                prefix = _literal_string(kw.value) or ""
            elif kw.arg == "dependencies":
                authed = _has_auth_dependency(kw.value)

        for target in node.targets:
            if isinstance(target, ast.Name):
                routers[target.id] = (prefix, authed)
    return routers


def _function_has_auth_dependency(fn: ast.AsyncFunctionDef | ast.FunctionDef) -> bool:
    defaults = [*fn.args.defaults, *fn.args.kw_defaults]
    return any(default is not None and _has_auth_dependency(default) for default in defaults)


def _iter_route_findings(file: Path) -> list[RouteFinding]:
    tree = ast.parse(file.read_text(encoding="utf-8"), filename=str(file))
    routers = _router_metadata(tree)
    findings: list[RouteFinding] = []

    for node in ast.walk(tree):
        if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            continue

        fn_authed = _function_has_auth_dependency(node)
        for dec in node.decorator_list:
            if not isinstance(dec, ast.Call) or not isinstance(dec.func, ast.Attribute):
                continue
            method = dec.func.attr
            if method not in HTTP_METHODS:
                continue

            owner = _name(dec.func.value)
            route_path = _literal_string(dec.args[0]) if dec.args else None
            if route_path is None:
                continue

            prefix, router_authed = routers.get(owner, ("", False))
            full_path = _join_paths(prefix, route_path)
            if full_path in PUBLIC_PATHS or full_path in SIGNED_WEBSOCKET_PATHS:
                continue
            if router_authed or fn_authed:
                continue

            findings.append(RouteFinding(method.upper(), full_path, file, node.lineno))

    return findings


def main() -> int:
    failures: list[RouteFinding] = []
    for file in ROUTE_FILES:
        failures.extend(_iter_route_findings(file))

    if failures:
        print("Unauthenticated routes found:")
        for failure in failures:
            rel = failure.file.relative_to(BACKEND_DIR)
            print(f"{failure.method:10} {failure.path:45} {rel}:{failure.line}")
        return 1

    print("Route auth audit passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
