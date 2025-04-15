// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export function isArrayOf<T>(v: unknown, check: (e: unknown) => boolean): v is T[] {
    if (!Array.isArray(v)) {
        return false;
    }

    return v.every(check);
}

export function isStringArray(v: unknown): v is string[] {
    return isArrayOf(v, (e) => typeof e === 'string');
}

export function isRecordOf<T>(v: unknown, check: (e: unknown) => boolean): v is Record<string, T> {
    if (typeof v !== 'object' || !v) {
        return false;
    }

    if (!(Object.keys(v).every((k) => typeof k === 'string'))) {
        return false;
    }

    if (!(Object.values(v).every(check))) {
        return false;
    }

    return true;
}

export function ensureString(v: unknown): string {
    return typeof v === 'string' ? v : '';
}

export function ensureNumber(v: unknown): number {
    return typeof v === 'number' ? v : 0;
}

export function secureGetFromRecord<T>(v: Record<string, T> | undefined, key: string) {
    return typeof v === 'object' && v && Object.prototype.hasOwnProperty.call(v, key) ? v[key] : undefined;
}

export function includes<T extends U, U>(array: T[], value: U) {
    return array.includes(value as T);
}
