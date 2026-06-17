// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ALLOWED_DOMAIN_PATTERNS} from './constants';
import {logError} from './log';

export function validateServerUrl(url: string): void {
    let parsed: URL;
    try {
        parsed = new URL(url);
    } catch {
        logError(`Invalid URL: ${url}`);
        process.exit(1);
    }

    if (parsed.protocol !== 'https:') {
        logError(`Only HTTPS URLs are allowed, got: ${parsed.protocol}`);
        process.exit(1);
    }

    const hostname = parsed.hostname.toLowerCase();

    if (/^(127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|0\.|localhost|::1|\[::1\])/.test(hostname)) {
        logError(`Private/internal URLs are not allowed: ${hostname}`);
        process.exit(1);
    }

    const isDomainAllowed = ALLOWED_DOMAIN_PATTERNS.some((pattern) => pattern.test(hostname));
    if (!isDomainAllowed) {
        logError(`Domain not in allowlist: ${hostname}. Allowed patterns: ${ALLOWED_DOMAIN_PATTERNS.map((p) => p.source).join(', ')}`);
        process.exit(1);
    }
}
