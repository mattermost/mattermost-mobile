// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {getDisplayProductName, isMattermostEmail, isMattermostWebsite} from './branding';

jest.mock('expo-application', () => ({
    applicationId: 'com.encma.hxmain',
}));

describe('ENCMA branding helpers', () => {
    it('brands only the default product name and preserves custom site names', () => {
        expect(getDisplayProductName()).toBe('ENCMA');
        expect(getDisplayProductName('Mattermost')).toBe('ENCMA');
        expect(getDisplayProductName('mattermost')).toBe('ENCMA');
        expect(getDisplayProductName('Example Team')).toBe('Example Team');
    });

    it('recognizes only Mattermost-owned website hosts', () => {
        expect(isMattermostWebsite('https://mattermost.com/pl/help')).toBe(true);
        expect(isMattermostWebsite('https://docs.mattermost.com/guide')).toBe(true);
        expect(isMattermostWebsite('https://about.mattermost.com/default-terms/')).toBe(true);
        expect(isMattermostWebsite('https://mattermost.com.example.org/help')).toBe(false);
        expect(isMattermostWebsite('https://example.org/help')).toBe(false);
        expect(isMattermostWebsite('not a url')).toBe(false);
        expect(isMattermostWebsite()).toBe(false);
    });

    it('recognizes the upstream support mailbox without blocking custom email', () => {
        expect(isMattermostEmail('reportaproblem@mattermost.com')).toBe(true);
        expect(isMattermostEmail('SUPPORT@MATTERMOST.COM')).toBe(true);
        expect(isMattermostEmail('support@example.org')).toBe(false);
        expect(isMattermostEmail()).toBe(false);
    });
});
