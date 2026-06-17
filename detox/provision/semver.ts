// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export function parseSemverCore(version: string): number[] {
    const core = String(version).replace(/^v/i, '').split('+')[0]?.split('-')[0] ?? '';
    return core.split('.').map((part) => Number(part) || 0);
}

export function semverGte(version: string, minimum: string): boolean {
    const left = parseSemverCore(version);
    const right = parseSemverCore(minimum);
    for (let i = 0; i < 3; i++) {
        const l = left[i] || 0;
        const r = right[i] || 0;
        if (l > r) {
            return true;
        }
        if (l < r) {
            return false;
        }
    }
    return true;
}

export function compareReleaseTagsDesc(a: string, b: string): number {
    const aIsMaster = a === 'latest-master';
    const bIsMaster = b === 'latest-master';
    if (aIsMaster && !bIsMaster) {
        return -1;
    }
    if (!aIsMaster && bIsMaster) {
        return 1;
    }
    const left = parseSemverCore(a);
    const right = parseSemverCore(b);
    for (let i = 0; i < 3; i++) {
        const l = left[i] || 0;
        const r = right[i] || 0;
        if (l !== r) {
            return r - l;
        }
    }
    return 0;
}
