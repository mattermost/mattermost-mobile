// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {hasReliableWebsocket} from './config';

describe('Config utilities', () => {
    test('hasReliableWebsocket', () => {
        expect(hasReliableWebsocket('5.8.0')).toBe(false);
        expect(hasReliableWebsocket('6.4.0', 'false')).toBe(false);
        expect(hasReliableWebsocket('6.4.0', 'true')).toBe(true);
        expect(hasReliableWebsocket('9.4.0', 'false')).toBe(true);
        expect(hasReliableWebsocket('9.4.0', 'true')).toBe(true);
        expect(hasReliableWebsocket('9.4.0')).toBe(true);
    });
});
