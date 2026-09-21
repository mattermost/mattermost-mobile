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

    describe('addEventListener', () => {
        it('should subscribe to Linking url events and return an unsubscribe function', () => {
            const remove = jest.fn();
            (Linking.addEventListener as jest.Mock).mockReturnValue({remove});

            const unsubscribe = addEventListener();

            expect(Linking.addEventListener).toHaveBeenCalledWith('url', expect.any(Function));

            unsubscribe();

            expect(remove).toHaveBeenCalled();
        });
    });

    describe('redirectSystemPath', () => {
        it('should return the path unchanged when the url is not handled, regardless of initial', async () => {
            const path = 'mailto:someone@example.com';

            expect(await redirectSystemPath({path, initial: false})).toBe(path);
            expect(await redirectSystemPath({path, initial: true})).toBe(path);
            expect(parseAndHandleDeepLink).not.toHaveBeenCalled();
        });

        it('should return null when the url is an SSO redirect, regardless of initial', async () => {
            const path = `${Sso.REDIRECT_URL_SCHEME}some/path`;

            expect(await redirectSystemPath({path, initial: false})).toBeNull();
            expect(await redirectSystemPath({path, initial: true})).toBeNull();
        });

        it('should return null and not alert when the deep link is handled successfully, regardless of initial', async () => {
            const path = 'https://community.mattermost.com/team/channels/town-square';

            expect(await redirectSystemPath({path, initial: false})).toBeNull();
            expect(await redirectSystemPath({path, initial: true})).toBeNull();

            expect(parseAndHandleDeepLink).toHaveBeenCalledWith(path, undefined, undefined, true);
            expect(alertInvalidDeepLink).not.toHaveBeenCalled();
        });

        it('should return the path and alert when the deep link handling errors, regardless of initial', async () => {
            (parseAndHandleDeepLink as jest.Mock).mockResolvedValue({error: true});

            const path = 'https://community.mattermost.com/team/channels/town-square';

            expect(await redirectSystemPath({path, initial: false})).toBe(path);
            expect(await redirectSystemPath({path, initial: true})).toBe(path);

            expect(alertInvalidDeepLink).toHaveBeenCalledTimes(2);
        });
    });

    describe('handleUrl (via addEventListener subscription callback)', () => {
        const getHandler = (): (event: {url: string}) => Promise<boolean> => {
            addEventListener();
            const call = (Linking.addEventListener as jest.Mock).mock.calls[0];
            return call[1];
        };

        it('should return false for a url with a protocol but no host', async () => {
            const handleUrl = getHandler();

            const result = await handleUrl({url: 'mailto:someone@example.com'});

            expect(result).toBe(false);
            expect(parseAndHandleDeepLink).not.toHaveBeenCalled();
        });

        it('should return true and skip deep link handling for the SSO redirect scheme', async () => {
            const handleUrl = getHandler();

            const result = await handleUrl({url: `${Sso.REDIRECT_URL_SCHEME}callback`});

            expect(result).toBe(true);
            expect(parseAndHandleDeepLink).not.toHaveBeenCalled();
        });

        it('should return true and skip deep link handling for the SSO dev redirect scheme', async () => {
            const handleUrl = getHandler();

            const result = await handleUrl({url: `${Sso.REDIRECT_URL_SCHEME_DEV}callback`});

            expect(result).toBe(true);
            expect(parseAndHandleDeepLink).not.toHaveBeenCalled();
        });

        it('should return true when the deep link is handled successfully', async () => {
            const handleUrl = getHandler();

            const result = await handleUrl({url: 'https://community.mattermost.com/team/channels/town-square'});

            expect(result).toBe(true);
            expect(alertInvalidDeepLink).not.toHaveBeenCalled();
        });

        it('should alert and return false when the deep link errors', async () => {
            (parseAndHandleDeepLink as jest.Mock).mockResolvedValue({error: true});
            const handleUrl = getHandler();

            const result = await handleUrl({url: 'https://community.mattermost.com/team/channels/town-square'});

            expect(result).toBe(false);
            expect(alertInvalidDeepLink).toHaveBeenCalled();
        });

        it('should return false when the url is empty', async () => {
            const handleUrl = getHandler();

            const result = await handleUrl({url: ''});

            expect(result).toBe(false);
            expect(parseAndHandleDeepLink).not.toHaveBeenCalled();
        });
    });
});
