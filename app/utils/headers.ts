// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export function getResponseHeader(headers: Record<string, string> | undefined, name: string): string | undefined {
    if (!headers) {
        return undefined;
    }
    const lowerName = name.toLowerCase();
    const key = Object.keys(headers).find((k) => k.toLowerCase() === lowerName);
    return key ? headers[key] : undefined;
}
