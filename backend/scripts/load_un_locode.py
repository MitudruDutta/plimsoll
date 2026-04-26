"""Idempotent UN/LOCODE seed loader.

Reads a CSV file (default: ``scripts/data/un_locode_starter.csv``) and
upserts rows into the ``ports`` table. Re-running the script is safe.

CSV schema
----------
Required columns: ``un_locode,name,country,country_code,region,longitude,latitude``
Optional columns: ``psc_regime,is_eca``

UN/LOCODE rationale
-------------------
We deliberately use ``un_locode`` as the canonical port identifier (5-char
ISO 3166-1 alpha-2 + 3 char location). It's the same code Argus, OPIS,
AIS feeds, and PSC regimes all key off, so any future vendor integration
can join on it without name disambiguation.

Usage
-----
::

    # Default starter set
    python -m scripts.load_un_locode

    # Custom CSV (e.g. the full UNECE dataset)
    python -m scripts.load_un_locode --csv data/unece_full.csv

    # Dry-run (no DB writes)
    python -m scripts.load_un_locode --dry-run

The full UNECE dataset has tens of thousands of rows. The starter set
covers the 46 ports we actually exercise in the demo. When we go live
with real customers we point this loader at the UNECE export.
"""
from __future__ import annotations

import argparse
import csv
import logging
import os
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Optional

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session

from shared.database.database import Base, SessionLocal, engine
from shared.database.models import Port, PSCRegime

logger = logging.getLogger(__name__)

DEFAULT_CSV = Path(__file__).resolve().parent / "data" / "un_locode_starter.csv"


_PSC_REGIME_BY_VALUE = {regime.value: regime for regime in PSCRegime}


def _truthy(value: str | None) -> bool:
    return (value or "").strip().lower() in {"1", "true", "yes", "y", "t"}


@dataclass(frozen=True)
class PortRow:
    un_locode: str
    name: str
    country: str
    country_code: Optional[str]
    region: Optional[str]
    longitude: Optional[float]
    latitude: Optional[float]
    psc_regime: Optional[PSCRegime]
    is_eca: bool


def _coerce_float(raw: str | None) -> Optional[float]:
    if raw in (None, ""):
        return None
    try:
        return float(raw)
    except ValueError:
        return None


def _read_csv(path: Path) -> Iterable[PortRow]:
    with path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        required = {"un_locode", "name", "country"}
        missing = required - {col.lower() for col in reader.fieldnames or []}
        if missing:
            raise ValueError(f"{path}: missing required columns: {sorted(missing)}")

        for row in reader:
            un_locode = (row.get("un_locode") or "").strip().upper()
            if not un_locode:
                continue

            psc_raw = (row.get("psc_regime") or "").strip().lower()
            psc_regime = _PSC_REGIME_BY_VALUE.get(psc_raw) if psc_raw else None

            yield PortRow(
                un_locode=un_locode,
                name=(row.get("name") or "").strip(),
                country=(row.get("country") or "").strip(),
                country_code=(row.get("country_code") or "").strip() or None,
                region=(row.get("region") or "").strip() or None,
                longitude=_coerce_float(row.get("longitude")),
                latitude=_coerce_float(row.get("latitude")),
                psc_regime=psc_regime,
                is_eca=_truthy(row.get("is_eca")),
            )


def upsert_ports(db: Session, rows: Iterable[PortRow], *, dry_run: bool) -> tuple[int, int]:
    """Insert new ports + update changed metadata. Returns ``(inserted, updated)``."""
    inserted = 0
    updated = 0
    for row in rows:
        existing = db.query(Port).filter(Port.un_locode == row.un_locode).first()
        if existing is None:
            if dry_run:
                inserted += 1
                continue
            port = Port(
                name=row.name,
                un_locode=row.un_locode,
                country=row.country,
                country_code=row.country_code,
                region=row.region,
                longitude=row.longitude,
                latitude=row.latitude,
                psc_regime=row.psc_regime,
                is_eca=row.is_eca,
            )
            db.add(port)
            inserted += 1
            continue

        dirty = False
        for attr, new_value in (
            ("name", row.name),
            ("country", row.country),
            ("country_code", row.country_code),
            ("region", row.region),
            ("longitude", row.longitude),
            ("latitude", row.latitude),
            ("psc_regime", row.psc_regime),
            ("is_eca", row.is_eca),
        ):
            if new_value is None:
                continue
            if getattr(existing, attr) != new_value:
                if not dry_run:
                    setattr(existing, attr, new_value)
                dirty = True
        if dirty:
            updated += 1

    if not dry_run:
        db.commit()
    return inserted, updated


def main() -> int:
    parser = argparse.ArgumentParser(description="Seed the ports table from a UN/LOCODE CSV.")
    parser.add_argument("--csv", type=Path, default=DEFAULT_CSV)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--create-tables", action="store_true",
                        help="Run create_all() before loading. Use only for local SQLite.")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(message)s")

    if not args.csv.exists():
        logger.error("CSV not found: %s", args.csv)
        return 2

    if args.create_tables:
        Base.metadata.create_all(bind=engine)

    rows = list(_read_csv(args.csv))
    logger.info("Loaded %d candidate ports from %s", len(rows), args.csv)

    db = SessionLocal()
    try:
        inserted, updated = upsert_ports(db, rows, dry_run=args.dry_run)
    finally:
        db.close()

    if args.dry_run:
        logger.info("[dry-run] would insert %d, update %d ports", inserted, updated)
    else:
        logger.info("inserted %d, updated %d ports", inserted, updated)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
