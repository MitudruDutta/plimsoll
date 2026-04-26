"""Compliance evaluation harness.

Replays a golden JSONL set against the live ``ComplianceService`` and
``MaritimeKnowledgeBase`` and emits accuracy + coverage metrics. CI gates
the 92% top-1 target documented in the PRD.

Goldens
-------
``backend/data/eval/compliance_top1.jsonl`` is the canonical eval set.
Each line is::

    {
      "id": "rotterdam_eu_eca_container",
      "vessel": { "vessel_type": ..., "flag_state": ..., "gross_tonnage": ... },
      "port_code": "NLRTM",
      "expected": {
        "is_eca": true,
        "psc_regime": "paris_mou",
        "must_have": ["safety_certificate", ...]
      }
    }

Metrics
-------
- ``port_match`` — fraction of cases where the port's PSC regime + ECA flag
  match expectations.
- ``required_documents_recall`` — for each case, of the ``must_have`` doc
  types, how many show up in ``kb.search_required_documents()``. We report
  the macro-average.
- ``top1_accuracy`` — a case is "correct" when ``port_match`` is true AND
  recall is 1.0. This is the top-line CI metric.

CI usage
--------
::

    python -m scripts.eval_compliance --threshold 0.92

Exits non-zero if top-1 accuracy is below the threshold.
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import statistics
import sys
from collections.abc import Iterable
from dataclasses import dataclass
from pathlib import Path
from typing import Any

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session

from shared.database.database import SessionLocal
from shared.database.models import Port

logger = logging.getLogger(__name__)

DEFAULT_GOLDEN = Path(__file__).resolve().parents[1] / "data" / "eval" / "compliance_top1.jsonl"


@dataclass
class CaseResult:
    case_id: str
    port_match: bool
    required_recall: float
    correct: bool
    detail: dict[str, Any]


def _load_cases(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        raise FileNotFoundError(path)
    cases: list[dict[str, Any]] = []
    with path.open(encoding="utf-8") as handle:
        for line_no, raw in enumerate(handle, 1):
            raw = raw.strip()
            if not raw or raw.startswith("#"):
                continue
            try:
                cases.append(json.loads(raw))
            except json.JSONDecodeError as exc:
                raise ValueError(f"{path}:{line_no} invalid JSON: {exc}") from exc
    return cases


def _evaluate_port_metadata(
    db: Session, port_code: str, expected: dict[str, Any]
) -> tuple[bool, dict[str, Any]]:
    port = db.query(Port).filter(Port.un_locode == port_code).first()
    if port is None:
        return False, {"error": f"port not seeded: {port_code}"}

    actual_regime = port.psc_regime.value if port.psc_regime else None
    expected_regime = expected.get("psc_regime")
    expected_eca = bool(expected.get("is_eca", False))
    actual_eca = bool(port.is_eca)

    match = actual_regime == expected_regime and actual_eca == expected_eca
    return match, {
        "expected_regime": expected_regime,
        "actual_regime": actual_regime,
        "expected_eca": expected_eca,
        "actual_eca": actual_eca,
    }


def _evaluate_required_documents(case: dict[str, Any]) -> tuple[float, dict[str, Any]]:
    must_have = case["expected"].get("must_have") or []
    if not must_have:
        return 1.0, {"must_have": [], "found": []}

    try:
        from modules.maritime.maritime_knowledge_base import get_maritime_knowledge_base
    except Exception as exc:  # pragma: no cover - kb import failure
        return 0.0, {"error": f"kb import failed: {exc}"}

    kb = get_maritime_knowledge_base()
    vessel_type = case["vessel"].get("vessel_type")
    docs = kb.search_required_documents(case["port_code"], vessel_type)

    found = {d.get("document_type") for d in docs if isinstance(d, dict)}
    matched = [doc for doc in must_have if doc in found]
    recall = len(matched) / len(must_have)
    return recall, {"must_have": must_have, "found": sorted(found), "matched": matched}


def evaluate(cases: Iterable[dict[str, Any]]) -> list[CaseResult]:
    results: list[CaseResult] = []
    db = SessionLocal()
    try:
        for case in cases:
            case_id = case.get("id") or "<unknown>"
            port_match, port_detail = _evaluate_port_metadata(
                db, case["port_code"], case["expected"]
            )
            recall, doc_detail = _evaluate_required_documents(case)
            correct = port_match and recall >= 0.999

            results.append(
                CaseResult(
                    case_id=case_id,
                    port_match=port_match,
                    required_recall=recall,
                    correct=correct,
                    detail={"port": port_detail, "documents": doc_detail},
                )
            )
    finally:
        db.close()
    return results


def report(results: list[CaseResult], *, threshold: float, json_out: Path | None) -> int:
    if not results:
        logger.error("no cases evaluated; nothing to score")
        return 2

    top1 = sum(1 for r in results if r.correct) / len(results)
    port_acc = sum(1 for r in results if r.port_match) / len(results)
    recall_macro = statistics.fmean(r.required_recall for r in results)

    print("\n=== Compliance evaluation ===")
    print(f"cases:                {len(results)}")
    print(f"port_match accuracy:  {port_acc:.3f}")
    print(f"required_doc recall:  {recall_macro:.3f}")
    print(f"top-1 accuracy:       {top1:.3f}  (threshold {threshold:.2f})")

    failures = [r for r in results if not r.correct]
    if failures:
        print(f"\nFailures ({len(failures)}):")
        for r in failures:
            print(f"  - {r.case_id}: port={r.port_match} recall={r.required_recall:.2f}")

    if json_out is not None:
        json_out.parent.mkdir(parents=True, exist_ok=True)
        with json_out.open("w", encoding="utf-8") as handle:
            json.dump(
                {
                    "summary": {
                        "cases": len(results),
                        "top1": top1,
                        "port_match": port_acc,
                        "required_doc_recall": recall_macro,
                        "threshold": threshold,
                    },
                    "cases": [r.__dict__ for r in results],
                },
                handle,
                indent=2,
            )

    return 0 if top1 >= threshold else 1


def main() -> int:
    parser = argparse.ArgumentParser(description="Run the compliance eval harness.")
    parser.add_argument("--golden", type=Path, default=DEFAULT_GOLDEN)
    parser.add_argument("--threshold", type=float, default=0.92)
    parser.add_argument("--json-out", type=Path, default=None)
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(message)s")

    cases = _load_cases(args.golden)
    results = evaluate(cases)
    return report(results, threshold=args.threshold, json_out=args.json_out)


if __name__ == "__main__":
    raise SystemExit(main())
