#!/usr/bin/env python3
from __future__ import annotations

import json
import os

from openai import OpenAI


client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])

schema = {
    "name": "allpro_local_service_brief",
    "schema": {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "service": {"type": "string"},
            "city": {"type": "string"},
            "state": {"type": "string"},
            "title_tag": {"type": "string"},
            "meta_description": {"type": "string"},
            "outline": {"type": "array", "items": {"type": "string"}},
            "local_angles": {"type": "array", "items": {"type": "string"}},
            "cta_options": {"type": "array", "items": {"type": "string"}},
            "proof_needed": {"type": "array", "items": {"type": "string"}}
        },
        "required": [
            "service",
            "city",
            "state",
            "title_tag",
            "meta_description",
            "outline",
            "local_angles",
            "cta_options",
            "proof_needed"
        ]
    },
    "strict": True
}


def main() -> None:
    response = client.responses.create(
        model="gpt-4o-mini",
        input=[
            {
                "role": "system",
                "content": (
                    "You create SEO briefs for local service pages. "
                    "Output only the requested structured object. "
                    "Do not invent awards, permits, or reviews. "
                    "Bias toward people-first usefulness and proof requirements."
                ),
            },
            {
                "role": "user",
                "content": (
                    "Create a brief for a deck repair service page targeting Belleville, Illinois. "
                    "The contractor serves Metro East and wants honest, non-spammy local positioning."
                ),
            },
        ],
        text={
            "format": {
                "type": "json_schema",
                "name": schema["name"],
                "schema": schema["schema"],
                "strict": True,
            }
        },
    )

    print(response.output_text)
    print(json.dumps(json.loads(response.output_text), indent=2))


if __name__ == "__main__":
    main()
