// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export function secureGetFromRecord<T>(v: Record<string, T> | undefined, key: string) {
    return typeof v === 'object' && v && Object.prototype.hasOwnProperty.call(v, key) ? v[key] : undefined;
}
