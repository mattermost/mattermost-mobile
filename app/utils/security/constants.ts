// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {toMilliseconds} from '@utils/datetime';

export const PROMPT_AUTH_AFTER = toMilliseconds({minutes: 5});

export const DEVICE_SECURED_RETRY_DELAY = 350;

// Identifies the caller in log entries, which are user-exportable.
export const AuthenticationSource = {
    ManagedApp: 'ManagedApp',
    SecurityManager: 'SecurityManager',
} as const;

// eslint-disable-next-line @typescript-eslint/no-redeclare -- TypeScript supports same-name type/value pairs as enum alternative
export type AuthenticationSource = typeof AuthenticationSource[keyof typeof AuthenticationSource];
