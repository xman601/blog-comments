#!/usr/bin/env python3
"""
Profanity checker for GitHub Discussions moderation.

Reads the comment text from stdin (never from argv or a shell string) and
exits with:
    0  no profanity
    1  profanity detected
    2  usage / internal error (the caller must NOT treat this as profanity)

Extra words can be added without committing them, via either:
  - the BANNED_WORDS environment variable (newline- or comma-separated), set
    from a repository secret in the workflow, or
  - a local .banned/banned-words.txt file (gitignored), one word per line.
"""

import json
import os
import sys

from better_profanity import profanity

BANNED_WORDS_FILE = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "..", ".banned", "banned-words.txt"
)


def _split_words(raw):
    words = []
    for line in raw.replace(",", "\n").splitlines():
        word = line.strip()
        if word and not word.startswith("#"):
            words.append(word)
    return words


def load_extra_words():
    words = _split_words(os.environ.get("BANNED_WORDS", ""))
    try:
        with open(BANNED_WORDS_FILE, encoding="utf-8") as f:
            words.extend(_split_words(f.read()))
    except FileNotFoundError:
        pass
    return words


def check_profanity(comment):
    profanity.load_censor_words()
    extra = load_extra_words()
    if extra:
        profanity.add_censor_words(extra)
    return profanity.contains_profanity(comment)


def main():
    try:
        comment = sys.stdin.read()
        found = check_profanity(comment)
    except Exception as exc:  # report, but never as "profanity found"
        print(json.dumps({"error": str(exc)}))
        sys.exit(2)

    print(json.dumps({"profanity_detected": found}))
    sys.exit(1 if found else 0)


if __name__ == "__main__":
    main()
