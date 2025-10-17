#!/usr/bin/env python3
"""
Profanity checker for GitHub Discussions moderation.
Uses better-profanity library with built-in banned words list.
"""

from better_profanity import profanity
import sys
import json

def check_profanity(comment):
    """Check if comment contains profanity."""
    profanity.load_censor_words()
    return profanity.contains_profanity(comment)

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No comment provided"}))
        sys.exit(1)

    comment = sys.argv[1]
    
    if check_profanity(comment):
        print(json.dumps({"profanity_detected": True}))
        sys.exit(1)  # Exit with error code to indicate profanity found
    else:
        print(json.dumps({"profanity_detected": False}))
        sys.exit(0)

if __name__ == "__main__":
    main()
