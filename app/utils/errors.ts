// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export function isServerError(obj: unknown): obj is {server_error_id: string; message?: string} {
    return (
        typeof obj === 'object' &&
        obj !== null &&
        'server_error_id' in obj &&
        typeof obj.server_error_id === 'string'
    );
}
