// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {testExports} from './index';

describe('shouldAttachServerAuthHeaders', () => {
    const {shouldAttachServerAuthHeaders} = testExports;

    it.each([
        ['https://mattermost.example.com', 'https://mattermost.example.com/api/v4/files/file-id'],
        ['https://mattermost.example.com/', 'https://mattermost.example.com/api/v4/files/file-id/preview'],
        ['https://mattermost.example.com/mattermost', 'https://mattermost.example.com/mattermost/api/v4/files/file-id'],
        ['https://mattermost.example.com/mattermost/', 'https://mattermost.example.com/mattermost/api/v4/files/file-id/preview'],
    ])('should accept API paths under server URL %s', (serverUrl, uri) => {
        expect(shouldAttachServerAuthHeaders(uri, serverUrl)).toBe(true);
    });

    it.each([
        ['https://mattermost.example.com/api/v4/files/file-id', 'https://mattermost.example.com/mattermost'],
        ['https://mattermost.example.com/other/api/v4/files/file-id', 'https://mattermost.example.com/mattermost'],
        ['https://external.example.com/mattermost/api/v4/files/file-id', 'https://mattermost.example.com/mattermost'],
    ])('should reject URI %s outside server URL %s', (uri, serverUrl) => {
        expect(shouldAttachServerAuthHeaders(uri, serverUrl)).toBe(false);
    });
});
