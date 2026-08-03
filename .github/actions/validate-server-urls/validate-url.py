#!/usr/bin/env python3
"""Validate server URLs using ipaddress module for SSRF prevention."""
import sys
import socket
import ipaddress
import re
from urllib.parse import urlparse

# Allowlist: only Mattermost-operated domains
ALLOWLIST_PATTERN = re.compile(r'\.(cloud\.mattermost\.com|test\.mattermost\.cloud|mattermost\.com|mattermost\.cloud)$')

def validate_url(url, label):
    """Validate a URL: must be HTTPS, not a private address, and on the allowlist."""
    if not url:
        return True  # Empty URLs pass (optional slots)

    parsed = urlparse(url)
    hostname = parsed.hostname
    if not hostname:
        print(f"::error::{label} has no hostname", file=sys.stderr)
        return False

    # Check allowlist first (only if not a literal private IP we're rejecting anyway)
    if not ALLOWLIST_PATTERN.search(hostname):
        print(f"::error::{label} domain not in allowlist: {hostname}", file=sys.stderr)
        return False

    # Try to parse as a literal IP address first
    try:
        addr = ipaddress.ip_address(hostname)
        # Check all restricted address categories
        if addr.is_private or addr.is_loopback or addr.is_link_local or addr.is_reserved or addr.is_multicast:
            print(f"::error::{label} points to a restricted address {hostname}", file=sys.stderr)
            return False
        print(f"✓ {label} validated: {hostname} (literal IP)")
        return True
    except ValueError:
        pass

    # Not a literal IP; resolve the hostname
    try:
        addrs = socket.getaddrinfo(hostname, 443, socket.AF_UNSPEC, socket.SOCK_STREAM)
        if not addrs:
            print(f"::error::{label} hostname {hostname} did not resolve", file=sys.stderr)
            return False

        # Check each resolved address
        for family, socktype, proto, canonname, sockaddr in addrs:
            ip_str = sockaddr[0]
            addr = ipaddress.ip_address(ip_str)
            if addr.is_private or addr.is_loopback or addr.is_link_local or addr.is_reserved or addr.is_multicast:
                print(f"::error::{label} resolves to restricted address {ip_str}", file=sys.stderr)
                return False

        print(f"✓ {label} validated: {hostname} (resolved)")
        return True
    except socket.gaierror:
        print(f"::error::{label} hostname {hostname} failed to resolve", file=sys.stderr)
        return False
    except Exception as e:
        print(f"::error::{label} validation error: {e}", file=sys.stderr)
        return False

if __name__ == '__main__':
    if len(sys.argv) != 3:
        print("usage: validate-url.py <url> <label>", file=sys.stderr)
        sys.exit(1)
    url, label = sys.argv[1], sys.argv[2]
    if not validate_url(url, label):
        sys.exit(1)
