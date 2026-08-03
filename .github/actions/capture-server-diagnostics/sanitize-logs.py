#!/usr/bin/env python3
"""Sanitize server logs by redacting PII before artifact upload."""
import sys
import json
import re

def sanitize_logs(input_file, output_file):
    """Read raw logs, redact PII, and write sanitized logs."""
    try:
        with open(input_file) as f:
            try:
                logs = json.load(f)
            except json.JSONDecodeError:
                # If JSON is malformed, write empty array
                logs = []

        # Sanitize each log entry: redact emails, usernames, tokens, and sensitive fields
        for entry in logs if isinstance(logs, list) else []:
            if not isinstance(entry, dict):
                continue
            msg = entry.get('message', '')
            if not isinstance(msg, str):
                continue

            # Redact email-like patterns
            msg = re.sub(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', '[redacted-email]', msg)
            # Redact common credential patterns (tokens, passwords in logs)
            msg = re.sub(r'(?:token|password|auth|Bearer|bearer)\s*[:=]\s*["\']?[^\s"\']+["\']?', '[redacted-credential]', msg, flags=re.IGNORECASE)
            # Redact usernames in quotes
            msg = re.sub(r'"(?:username|user_id|user|actor)":\s*"[^"]*"', '"[redacted-field]": "[redacted-value]"', msg)
            # Redact numeric IDs that might be sensitive
            msg = re.sub(r'"id":\s*"[a-z0-9]{25,}"', '"id": "[redacted-id]"', msg)

            entry['message'] = msg

        # Write sanitized logs
        with open(output_file, 'w') as f:
            json.dump(logs, f, indent=2)
        return True
    except Exception:
        # On error, write empty array rather than fail the diagnostics step
        with open(output_file, 'w') as f:
            json.dump([], f)
        return True

if __name__ == '__main__':
    if len(sys.argv) != 3:
        print("usage: sanitize-logs.py <input-file> <output-file>", file=sys.stderr)
        sys.exit(1)
    input_file, output_file = sys.argv[1], sys.argv[2]
    if not sanitize_logs(input_file, output_file):
        sys.exit(1)
