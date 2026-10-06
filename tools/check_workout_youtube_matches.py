#!/usr/bin/env python3
"""Check workout exercise names against linked YouTube video titles.

Usage:
  python3 tools/check_workout_youtube_matches.py week-4-workouts.json --insecure

The script uses YouTube's public oEmbed endpoint to fetch video titles. It does
not need an API key.
"""

from __future__ import annotations

import argparse
import json
import re
import ssl
import sys
import urllib.parse
import urllib.request
from difflib import SequenceMatcher
from pathlib import Path


STOP_WORDS = {
    "a",
    "an",
    "and",
    "at",
    "best",
    "build",
    "by",
    "do",
    "exercise",
    "for",
    "form",
    "guide",
    "how",
    "in",
    "jeff",
    "nippard",
    "of",
    "on",
    "proper",
    "technique",
    "the",
    "to",
    "tutorial",
    "with",
    "you",
}


ALIASES = {
    "barbell": {"bb"},
    "bb": {"barbell"},
    "cable": {"cables"},
    "cables": {"cable"},
    "db": {"dumbbell", "dumbbells"},
    "dumbbell": {"db", "dumbbells"},
    "dumbbells": {"db", "dumbbell"},
    "ez": {"ezbar"},
    "ezbar": {"ez"},
    "lat": {"lats"},
    "lats": {"lat"},
    "pec": {"chest"},
    "rear": {"posterior"},
    "rom": {"range", "motion"},
    "triceps": {"tricep"},
    "tricep": {"triceps"},
}


def normalize_tokens(value: str) -> set[str]:
    value = value.lower()
    value = value.replace("45°", "45").replace("1-arm", "single arm")
    value = re.sub(r"[^a-z0-9]+", " ", value)
    tokens = {token for token in value.split() if token and token not in STOP_WORDS}
    expanded = set(tokens)
    for token in tokens:
        expanded.update(ALIASES.get(token, set()))
    return expanded


def similarity(name: str, title: str) -> float:
    name_tokens = normalize_tokens(name)
    title_tokens = normalize_tokens(title)
    if not name_tokens:
        return 0.0

    overlap = len(name_tokens & title_tokens) / len(name_tokens)
    ratio = SequenceMatcher(None, " ".join(sorted(name_tokens)), " ".join(sorted(title_tokens))).ratio()
    return round((0.75 * overlap) + (0.25 * ratio), 3)


def fetch_title(url: str, *, context: ssl.SSLContext | None, timeout: float) -> str:
    endpoint = "https://www.youtube.com/oembed?format=json&url=" + urllib.parse.quote(
        url,
        safe="",
    )
    request = urllib.request.Request(endpoint, headers={"User-Agent": "workout-link-checker/1.0"})
    with urllib.request.urlopen(request, context=context, timeout=timeout) as response:
        payload = json.load(response)
    return payload["title"]


def row_items(row: dict) -> list[tuple[str, str, str]]:
    return [
        ("exercise", row.get("exercise", ""), row.get("exercise_youtube_url", "")),
        (
            "substitution_option_1",
            row.get("substitution_option_1", ""),
            row.get("substitution_option_1_youtube_url", ""),
        ),
        (
            "substitution_option_2",
            row.get("substitution_option_2", ""),
            row.get("substitution_option_2_youtube_url", ""),
        ),
    ]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("json_path", type=Path)
    parser.add_argument("--threshold", type=float, default=0.55)
    parser.add_argument("--timeout", type=float, default=12.0)
    parser.add_argument(
        "--apply-swaps",
        action="store_true",
        help="Rewrite the JSON by swapping substitution option 1/2 URLs for strong swap candidates.",
    )
    parser.add_argument(
        "--insecure",
        action="store_true",
        help="Disable TLS certificate verification for local machines with broken Python cert stores.",
    )
    args = parser.parse_args()

    context = ssl._create_unverified_context() if args.insecure else None
    rows = json.loads(args.json_path.read_text())

    cache: dict[str, str] = {}
    weak_matches = []
    swap_suggestions = []

    for row in rows:
        for _, _, url in row_items(row):
            if url and url not in cache:
                try:
                    cache[url] = fetch_title(url, context=context, timeout=args.timeout)
                except Exception as exc:  # noqa: BLE001 - CLI should report and continue.
                    cache[url] = f"<fetch failed: {exc}>"

        scored = []
        for field, name, url in row_items(row):
            title = cache.get(url, "")
            score = similarity(name, title)
            scored.append((field, name, url, title, score))
            if score < args.threshold:
                weak_matches.append((row, field, name, url, title, score))

        sub1 = scored[1]
        sub2 = scored[2]
        current = sub1[4] + sub2[4]
        swapped = similarity(sub1[1], sub2[3]) + similarity(sub2[1], sub1[3])
        if swapped > current + 0.35:
            swap_suggestions.append((row, sub1, sub2, current, round(swapped, 3)))

    print(f"Checked {len(rows)} workout rows from {args.json_path}")
    print(f"Fetched {len(cache)} unique YouTube titles")
    print(f"Weak matches below threshold {args.threshold}: {len(weak_matches)}")
    print(f"Potential substitution URL swaps: {len(swap_suggestions)}")

    if weak_matches:
        print("\nWeak matches:")
        for row, field, name, url, title, score in weak_matches:
            print(
                f"- week {row['week']} day {row['day_number']} exercise {row['exercise_order']} "
                f"{field}: score={score}"
            )
            print(f"  name:  {name}")
            print(f"  title: {title}")
            print(f"  url:   {url}")

    if swap_suggestions:
        print("\nPotential swaps:")
        for row, sub1, sub2, current, swapped in swap_suggestions:
            print(
                f"- week {row['week']} day {row['day_number']} exercise {row['exercise_order']} "
                f"({row['exercise']}): current={round(current, 3)} swapped={swapped}"
            )
            print(f"  option 1 name/title: {sub1[1]} -> {sub1[3]}")
            print(f"  option 2 name/title: {sub2[1]} -> {sub2[3]}")

    if args.apply_swaps and swap_suggestions:
        for row, *_ in swap_suggestions:
            (
                row["substitution_option_1_youtube_url"],
                row["substitution_option_2_youtube_url"],
            ) = (
                row["substitution_option_2_youtube_url"],
                row["substitution_option_1_youtube_url"],
            )
        args.json_path.write_text(json.dumps(rows, indent=2, ensure_ascii=False) + "\n")
        print(f"\nApplied {len(swap_suggestions)} substitution URL swaps to {args.json_path}")

    return 1 if weak_matches or swap_suggestions else 0


if __name__ == "__main__":
    sys.exit(main())
