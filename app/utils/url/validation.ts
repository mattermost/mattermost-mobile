// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/**
 * Validates URLs for bookmarks, matching server-side validation.
 * Supports http(s) and mattermost:// schemes while blocking dangerous schemes.
 */
export function isValidLinkURL(rawURL: string): boolean {
    // Dangerous schemes that should never be allowed (matches server-side blacklist)
    const dangerousSchemes = ['javascript', 'data', 'file', 'vbscript', 'about'];

    try {
        const url = new URL(rawURL);
        const scheme = url.protocol.replace(':', '').toLowerCase();

        // Check blacklist
        if (dangerousSchemes.includes(scheme)) {
            return false;
        }

        // Whitelist: http, https, mattermost (matches server-side whitelist)
        if (scheme === 'http' || scheme === 'https') {
            // For http(s), require host
            return url.host !== '';
        }

        if (scheme === 'mattermost') {
            return true;
        }

        return false;
    } catch {
        return false;
    }
}
