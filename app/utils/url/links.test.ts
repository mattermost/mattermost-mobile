// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {createIntl} from 'react-intl';
import {Alert} from 'react-native';

import {onOpenLinkError, openLink} from './links';

describe('onOpenLinkError', () => {
    const intl = createIntl({
        locale: 'en',
        messages: {},
    });
    intl.formatMessage = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should display an alert with the correct title and message', () => {
        const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

        // using jest.Mock as formatMessage has an implementation overload
        // and we want to mock the implementation that returns a string
        (intl.formatMessage as jest.Mock).
            mockReturnValueOnce('Error').
            mockReturnValueOnce('Unable to open the link.'); // Mock message

        onOpenLinkError(intl);

        expect(intl.formatMessage).toHaveBeenCalledTimes(2);
        expect(intl.formatMessage).toHaveBeenCalledWith({
            id: 'mobile.link.error.title',
            defaultMessage: 'Error',
        });
        expect(intl.formatMessage).toHaveBeenCalledWith({
            id: 'mobile.link.error.text',
            defaultMessage: 'Unable to open the link.',
        });
        expect(alertSpy).toHaveBeenCalledWith('Error', 'Unable to open the link.');
    });
});

describe('openLink', () => {
    const intl = createIntl({
        locale: 'en',
        messages: {},
    });
    intl.formatMessage = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should call normalizeProtocol and return early if the URL is invalid', async () => {
        const normalizeProtocolMock = jest.spyOn(require('.'), 'normalizeProtocol').mockReturnValue(null);

        await openLink('', 'https://server-url.com', 'https://site-url.com', intl);

        expect(normalizeProtocolMock).toHaveBeenCalledWith('');
        normalizeProtocolMock.mockRestore();
    });

    it('should handle deep link if matchDeepLink returns a match', async () => {
        const normalizeProtocolMock = jest.spyOn(require('.'), 'normalizeProtocol').mockReturnValue('https://example.com');
        const matchDeepLinkMock = jest.spyOn(require('@utils/deep_link'), 'matchDeepLink').mockReturnValue({url: 'https://example.com'});
        const handleDeepLinkMock = jest.spyOn(require('@utils/deep_link'), 'handleDeepLink').mockResolvedValue({error: null});

        await openLink('https://example.com', 'https://server-url.com', 'https://site-url.com', intl);

        expect(normalizeProtocolMock).toHaveBeenCalledWith('https://example.com');
        expect(matchDeepLinkMock).toHaveBeenCalledWith('https://example.com', 'https://server-url.com', 'https://site-url.com');
        expect(handleDeepLinkMock).toHaveBeenCalledWith('https://example.com', intl);

        normalizeProtocolMock.mockRestore();
        matchDeepLinkMock.mockRestore();
        handleDeepLinkMock.mockRestore();
    });

    it('should call tryOpenURL with onOpenLinkError if handleDeepLink returns an error', async () => {
        const normalizeProtocolMock = jest.spyOn(require('.'), 'normalizeProtocol').mockReturnValue('https://example.com');
        const matchDeepLinkMock = jest.spyOn(require('@utils/deep_link'), 'matchDeepLink').mockReturnValue({url: 'https://example.com'});
        const handleDeepLinkMock = jest.spyOn(require('@utils/deep_link'), 'handleDeepLink').mockResolvedValue({error: true});
        const tryOpenURLMock = jest.spyOn(require('.'), 'tryOpenURL').mockImplementation(() => {});

        await openLink('https://example.com', 'https://server-url.com', 'https://site-url.com', intl);

        expect(tryOpenURLMock).toHaveBeenCalledWith('https://example.com', onOpenLinkError);

        normalizeProtocolMock.mockRestore();
        matchDeepLinkMock.mockRestore();
        handleDeepLinkMock.mockRestore();
        tryOpenURLMock.mockRestore();
    });

    it('should call tryOpenURL with onOpenLinkError if matchDeepLink does not return a match', async () => {
        const normalizeProtocolMock = jest.spyOn(require('.'), 'normalizeProtocol').mockReturnValue('https://example.com');
        const matchDeepLinkMock = jest.spyOn(require('@utils/deep_link'), 'matchDeepLink').mockReturnValue(null);
        const tryOpenURLMock = jest.spyOn(require('.'), 'tryOpenURL').mockImplementation(() => {});

        await openLink('https://example.com', 'https://server-url.com', 'https://site-url.com', intl);

        expect(tryOpenURLMock).toHaveBeenCalledWith('https://example.com', onOpenLinkError);

        normalizeProtocolMock.mockRestore();
        matchDeepLinkMock.mockRestore();
        tryOpenURLMock.mockRestore();
    });
});
