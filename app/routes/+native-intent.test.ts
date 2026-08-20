// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Linking} from 'react-native';

import {Sso} from '@constants';
import {alertInvalidDeepLink, parseAndHandleDeepLink} from '@utils/deep_link';

import {addEventListener, redirectSystemPath} from './+native-intent';

jest.mock('@utils/deep_link');

describe('native-intent', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (parseAndHandleDeepLink as jest.Mock).mockResolvedValue({error: false});
    });

    describe('redirectSystemPath', () => {
        it('should return null for SSO redirect schemes', () => {
            expect(redirectSystemPath({path: `${Sso.REDIRECT_URL_SCHEME}callback`, initial: false})).toBeNull();
            expect(redirectSystemPath({path: `${Sso.REDIRECT_URL_SCHEME_DEV}callback`, initial: true})).toBeNull();
        });

        it('should return the path unchanged for non-SSO inputs', () => {
            const deepLink = 'https://community.mattermost.com/team/channels/town-square';
            const unrelated = 'https://example.com/not-sso';

            expect(redirectSystemPath({path: deepLink, initial: false})).toBe(deepLink);
            expect(redirectSystemPath({path: '', initial: true})).toBe('');
            expect(redirectSystemPath({path: unrelated, initial: false})).toBe(unrelated);
            expect(parseAndHandleDeepLink).not.toHaveBeenCalled();
        });
    });

    describe('addEventListener', () => {
        const getHandler = (): (event: {url: string}) => Promise<void> => {
            addEventListener();
            const call = (Linking.addEventListener as jest.Mock).mock.calls[0];
            return call[1];
        };

        it('should subscribe to Linking url events and return an unsubscribe function', () => {
            const remove = jest.fn();
            (Linking.addEventListener as jest.Mock).mockReturnValue({remove});

            const unsubscribe = addEventListener();

            expect(Linking.addEventListener).toHaveBeenCalledWith('url', expect.any(Function));

            unsubscribe();

            expect(remove).toHaveBeenCalled();
        });

        it('should swallow SSO redirect URLs without handling them as deep links', async () => {
            const handleUrl = getHandler();

            await handleUrl({url: `${Sso.REDIRECT_URL_SCHEME}callback`});
            await handleUrl({url: `${Sso.REDIRECT_URL_SCHEME_DEV}callback`});

            expect(parseAndHandleDeepLink).not.toHaveBeenCalled();
            expect(alertInvalidDeepLink).not.toHaveBeenCalled();
        });

        it('should parse valid Mattermost URLs', async () => {
            const handleUrl = getHandler();
            const url = 'https://community.mattermost.com/team/channels/town-square';

            await handleUrl({url});

            expect(parseAndHandleDeepLink).toHaveBeenCalledWith(url, undefined, undefined, true);
            expect(alertInvalidDeepLink).not.toHaveBeenCalled();
        });

        it('should alert when deep link handling errors', async () => {
            (parseAndHandleDeepLink as jest.Mock).mockResolvedValue({error: true});
            const handleUrl = getHandler();

            await handleUrl({url: 'https://community.mattermost.com/team/channels/town-square'});

            expect(alertInvalidDeepLink).toHaveBeenCalled();
        });
    });
});
