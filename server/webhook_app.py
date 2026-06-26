#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import hmac
import json
import os
import sqlite3
from datetime import datetime, timezone

from flask import Flask, jsonify, request


app = Flask(__name__)
DB_PATH = os.getenv("WEBHOOK_DB", "webhooks.db")
SHARED_SECRET = os.getenv("WEBHOOK_SHARED_SECRET", "change-me")


def db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        """
        create table if not exists webhook_events (
          id integer primary key autoincrement,
          provider text not null,
          event_type text not null,
          event_key text not null unique,
          received_at text not null,
          payload text not null,
          status text not null default 'received'
        )
        """
    )
    return conn


def verify_signature(raw_body: bytes, provided_sig: str | None) -> bool:
    if not provided_sig:
        return False
    digest = hmac.new(SHARED_SECRET.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(digest, provided_sig)


@app.post("/webhooks/<provider>")
def receive(provider: str):
    raw = request.get_data()
    provided_sig = request.headers.get("X-Signature")

    if provider in {"thumbtack", "call_tracking"} and not verify_signature(raw, provided_sig):
        return jsonify({"ok": False, "error": "invalid signature"}), 401

    payload = request.get_json(silent=True) or {}
    event_type = payload.get("eventType") or payload.get("type") or "unknown"
    event_key = payload.get("eventID") or payload.get("id") or hashlib.sha256(raw).hexdigest()

    conn = db()
    try:
        conn.execute(
            """
            insert into webhook_events (provider, event_type, event_key, received_at, payload)
            values (?, ?, ?, ?, ?)
            """,
            (
                provider,
                event_type,
                event_key,
                datetime.now(timezone.utc).isoformat(),
                json.dumps(payload, ensure_ascii=False),
            ),
        )
        conn.commit()
    except sqlite3.IntegrityError:
        return jsonify({"ok": True, "duplicate": True}), 200
    finally:
        conn.close()

    return jsonify({"ok": True}), 200


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080, debug=True)
