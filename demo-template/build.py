#!/usr/bin/env python3
"""
OpenClaw Demo Builder
Run: python build.py
Reads config.json and injects all client variables into every HTML template.
"""
import os, re, json, shutil

# ── Load config ──
with open('config.json', 'r', encoding='utf-8') as f:
    C = json.load(f)

TARGETS = []
for root, dirs, files in os.walk('.'):
    # Skip .git and node_modules
    dirs[:] = [d for d in dirs if d not in ['.git', '__pycache__']]
    for fname in files:
        if fname.endswith('.html'):
            TARGETS.append(os.path.join(root, fname))

REPLACEMENTS = {
    '[[CLIENT_NAME]]':        C['name'],
    '[[CLIENT_SHORT]]':       C['name_short'],
    '[[CLIENT_TAGLINE]]':     C['tagline'],
    '[[CLIENT_PHONE]]':       C['phone'],
    '[[CLIENT_PHONE_RAW]]':   C['phone_raw'],
    '[[CLIENT_EMAIL]]':       C['email'],
    '[[CLIENT_ADDRESS]]':     C['address'],
    '[[CLIENT_CITY]]':        C['city'],
    '[[CLIENT_STATE]]':       C['state'],
    '[[CLIENT_ZIP]]':         C['zip'],
    '[[CLIENT_COUNTY]]':      C['county'],
    '[[CLIENT_YEARS]]':       C['years_exp'],
    '[[CLIENT_FOUNDED]]':     C['founded'],
    '[[CLIENT_CURRENT_SITE]]': C['current_site'],
    '[[DEMO_DOMAIN]]':        C['demo_domain'],
    '[[DEMO_SLUG]]':          C['demo_slug'],
    '[[CLIENT_OWNER]]':       C['owner_name'],
    '[[CLIENT_OWNER_TITLE]]': C['owner_title'],
    '[[MISSED_REVENUE]]':     C['missed_revenue'],
    '[[PROJECTED_REVENUE]]':  C['projected_revenue'],
    '[[COLOR_PRIMARY]]':      C['color_primary'],
    '[[COLOR_PRIMARY_DARK]]': C['color_primary_dark'],
    '[[COLOR_PRIMARY_LIGHT]]': C['color_primary_light'],
    '[[COLOR_ACCENT]]':       C['color_accent'],
    '[[COLOR_BG]]':           C['color_bg'],
}

updated = 0
for path in TARGETS:
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    original = content
    for placeholder, value in REPLACEMENTS.items():
        content = content.replace(placeholder, value)
    if content != original:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        updated += 1
        print(f"  Updated: {path}")

print(f"\nBuild complete. {updated} files updated.")
print(f"Demo for: {C['name']} — {C['demo_domain']}/{C['demo_slug']}/")
