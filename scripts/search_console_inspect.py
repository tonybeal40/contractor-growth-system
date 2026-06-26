#!/usr/bin/env python3
from __future__ import annotations

import json
import os

from google.oauth2 import service_account
from googleapiclient.discovery import build


PROPERTY = os.environ["GSC_PROPERTY"]
INSPECTION_URL = os.environ["INSPECTION_URL"]
KEY_FILE = os.environ["GOOGLE_APPLICATION_CREDENTIALS"]
SCOPES = ["https://www.googleapis.com/auth/webmasters.readonly"]


def main() -> None:
    creds = service_account.Credentials.from_service_account_file(KEY_FILE, scopes=SCOPES)

    inspection_service = build("searchconsole", "v1", credentials=creds)
    inspect_body = {
        "inspectionUrl": INSPECTION_URL,
        "siteUrl": PROPERTY,
        "languageCode": "en-US",
    }
    inspect_resp = inspection_service.urlInspection().index().inspect(body=inspect_body).execute()
    print("URL INSPECTION:")
    print(json.dumps(inspect_resp, indent=2))

    analytics_service = build("searchconsole", "v1", credentials=creds)
    analytics_body = {
        "startDate": "2026-05-27",
        "endDate": "2026-06-26",
        "dimensions": ["page", "query", "device"],
        "rowLimit": 25,
    }
    analytics_resp = analytics_service.searchanalytics().query(siteUrl=PROPERTY, body=analytics_body).execute()
    print("\nSEARCH ANALYTICS:")
    print(json.dumps(analytics_resp, indent=2))


if __name__ == "__main__":
    main()
