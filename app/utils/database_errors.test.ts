// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {isDatabaseCorruptionError} from './database_errors';

describe('database_errors', () => {
    test('isDatabaseCorruptionError detects malformed database errors', () => {
        expect(isDatabaseCorruptionError(new Error('database disk image is malformed'))).toBe(true);
        expect(isDatabaseCorruptionError(new Error('SqliteError: database disk image is malformed (code: 11)'))).toBe(true);
    });

    test('isDatabaseCorruptionError ignores unrelated errors', () => {
        expect(isDatabaseCorruptionError(new Error('database is locked'))).toBe(false);
        expect(isDatabaseCorruptionError(new Error('network request failed'))).toBe(false);
        expect(isDatabaseCorruptionError('SQLITE_CORRUPT: database corruption at line 1')).toBe(false);
    });
});
