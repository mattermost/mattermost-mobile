// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export function getResponseHeader(headers: Record<string, string> | undefined, name: string): string | undefined {
    if (!headers) {
        return undefined;
    }
    const direct = headers[name];
    if (direct !== undefined) {
        return direct;
    }
    const lowerName = name.toLowerCase();
    const lowerDirect = headers[lowerName];
    if (lowerDirect !== undefined) {
        return lowerDirect;
    }
    for (const key in headers) {
        if (key.toLowerCase() === lowerName) {
            return headers[key];
        }
    }
    return undefined;
}
