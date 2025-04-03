// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {createIntl} from 'react-intl';
import {Navigation} from 'react-native-navigation';

import {makeDirectChannel, switchToChannelByName} from '@actions/remote/channel';
import {showPermalink} from '@actions/remote/permalink';
import {fetchUsersByUsernames} from '@actions/remote/user';
import {DeepLink, Launch, Preferences, Screens} from '@constants';
import DatabaseManager from '@database/manager';
import {t} from '@i18n';
import WebsocketManager from '@managers/websocket_manager';
import {getActiveServerUrl} from '@queries/app/servers';
import {queryUsersByUsername} from '@queries/servers/user';
import {dismissAllModalsAndPopToRoot} from '@screens/navigation';
import NavigationStore from '@store/navigation_store';
import {logError} from '@utils/log';
import {addNewServer} from '@utils/server';

import {alertErrorWithFallback, errorBadChannel, errorUnkownUser} from '../draft';

import {alertInvalidDeepLink, extractServerUrl, getLaunchPropsFromDeepLink, handleDeepLink} from '.';

jest.mock('@actions/remote/user', () => ({
    fetchUsersByUsernames: jest.fn(),
}));

jest.mock('@actions/remote/permalink', () => ({
    showPermalink: jest.fn(),
}));

jest.mock('@queries/app/servers', () => ({
    getActiveServerUrl: jest.fn(),
}));

jest.mock('@queries/servers/user', () => ({
    getCurrentUser: jest.fn(),
    queryUsersByUsername: jest.fn(() => ({fetchIds: jest.fn(() => ['user-id'])})),
}));

jest.mock('@database/manager', () => ({
    searchUrl: jest.fn(),
    setActiveServerDatabase: jest.fn(),
    getServerDatabaseAndOperator: jest.fn(() => ({database: {}, operator: {}})),
}));

jest.mock('@managers/websocket_manager', () => ({
    initializeClient: jest.fn(),
}));

jest.mock('@store/navigation_store', () => ({
    getVisibleScreen: jest.fn(() => 'HOME'),
    hasModalsOpened: jest.fn(() => false),
    waitUntilScreenHasLoaded: jest.fn(),
    getScreensInStack: jest.fn().mockReturnValue([]),
}));

jest.mock('@utils/server', () => ({
    addNewServer: jest.fn(),
}));

jest.mock('@actions/remote/channel', () => ({
    makeDirectChannel: jest.fn(),
    switchToChannelByName: jest.fn(),
}));

jest.mock('@utils/draft', () => ({
    errorBadChannel: jest.fn(),
    errorUnkownUser: jest.fn(),
    alertErrorWithFallback: jest.fn(),
}));

jest.mock('@utils/log', () => ({
    logError: jest.fn(),
}));

jest.mock('@i18n', () => ({
    DEFAULT_LOCALE: 'en',
    getTranslations: jest.fn(() => ({})),
    t: jest.fn((id) => id),
}));

describe('extractServerUrl', () => {
    it('should extract the sanitized server url', () => {
        expect(extractServerUrl('example.com:8080//path/to///login')).toEqual('example.com:8080/path/to');
        expect(extractServerUrl('localhost:3000/signup')).toEqual('localhost:3000');
        expect(extractServerUrl('192.168.0.1/admin_console')).toEqual('192.168.0.1');
        expect(extractServerUrl('example.com/path//to/resource')).toEqual('example.com/path/to/resource');
        expect(extractServerUrl('my.local.network/.../resource/admin_console')).toEqual('my.local.network/resource');
        expect(extractServerUrl('my.local.network//ad-1/channels/%252f%252e.town-square')).toEqual(null);
        expect(extractServerUrl('example.com:8080')).toEqual('example.com:8080');
        expect(extractServerUrl('example.com:8080/')).toEqual('example.com:8080');
    });
});

describe('handleDeepLink', () => {
    const intl = createIntl({locale: 'en', messages: {}});

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return error for invalid deep link', async () => {
        const result = await handleDeepLink('invalid-url');
        expect(result).toEqual({error: true});
    });

    it('should add new server if not existing', async () => {
        (getActiveServerUrl as jest.Mock).mockResolvedValueOnce('https://currentserver.com');
        (DatabaseManager.searchUrl as jest.Mock).mockReturnValueOnce('');
        const result = await handleDeepLink('https://newserver.com/team/channels/town-square');
        expect(addNewServer).toHaveBeenCalledWith(Preferences.THEMES.denim, 'newserver.com', undefined, {type: DeepLink.Channel,
            data: {
                serverUrl: 'newserver.com',
                channelName: 'town-square',
                teamName: 'team',
            },
            url: 'https://newserver.com/team/channels/town-square',
        });
        expect(result).toEqual({error: false});
    });

    it('should handle existing server and switch to home screen', async () => {
        (getActiveServerUrl as jest.Mock).mockResolvedValueOnce('https://currentserver.com');
        (DatabaseManager.searchUrl as jest.Mock).mockReturnValueOnce('https://existingserver.com');
        const result = await handleDeepLink('https://existingserver.com/team/channels/town-square');
        expect(dismissAllModalsAndPopToRoot).toHaveBeenCalled();
        expect(DatabaseManager.setActiveServerDatabase).toHaveBeenCalledWith('https://existingserver.com');
        expect(WebsocketManager.initializeClient).toHaveBeenCalledWith('https://existingserver.com', 'DeepLink');
        expect(result).toEqual({error: false});
    });

    it('should update the server url in the server url screen', async () => {
        (getActiveServerUrl as jest.Mock).mockResolvedValueOnce('https://currentserver.com');
        (DatabaseManager.searchUrl as jest.Mock).mockReturnValueOnce(null);

        (NavigationStore.getVisibleScreen as jest.Mock).mockReturnValueOnce(Screens.SERVER);
        const result = await handleDeepLink('https://currentserver.com/team/channels/town-square', undefined, undefined, true);
        const spyOnUpdateProps = jest.spyOn(Navigation, 'updateProps');
        expect(spyOnUpdateProps).toHaveBeenCalledWith(Screens.SERVER, {serverUrl: 'currentserver.com'});
        expect(result).toEqual({error: false});
    });

    it('should not display the new server modal if the server screen is on the stack but not as the visible screen', async () => {
        (getActiveServerUrl as jest.Mock).mockResolvedValueOnce('https://currentserver.com');
        (DatabaseManager.searchUrl as jest.Mock).mockReturnValueOnce(null);

        (NavigationStore.getVisibleScreen as jest.Mock).mockReturnValueOnce(Screens.LOGIN);
        (NavigationStore.getScreensInStack as jest.Mock).mockReturnValueOnce([Screens.SERVER, Screens.LOGIN]);
        const result = await handleDeepLink('https://currentserver.com/team/channels/town-square', undefined, undefined, true);
        expect(addNewServer).not.toHaveBeenCalled();
        expect(result).toEqual({error: false});
    });

    it('should switch to channel by name for Channel deep link', async () => {
        (DatabaseManager.searchUrl as jest.Mock).mockReturnValueOnce('https://existingserver.com');
        (getActiveServerUrl as jest.Mock).mockResolvedValueOnce('https://existingserver.com');
        const result = await handleDeepLink('https://existingserver.com/team/channels/town-square', intl);
        expect(switchToChannelByName).toHaveBeenCalledWith('https://existingserver.com', 'town-square', 'team', errorBadChannel, intl);
        expect(result).toEqual({error: false});
    });

    it('should create direct message for DirectMessage deep link', async () => {
        (DatabaseManager.searchUrl as jest.Mock).mockReturnValueOnce('https://existingserver.com');
        (getActiveServerUrl as jest.Mock).mockResolvedValueOnce('https://existingserver.com');
        (queryUsersByUsername as jest.Mock).mockReturnValueOnce({fetchIds: jest.fn(() => ['user-id'])});
        const result = await handleDeepLink('https://existingserver.com/team/messages/@user-id', intl);
        expect(makeDirectChannel).toHaveBeenCalledWith('https://existingserver.com', 'user-id', '', true);
        expect(result).toEqual({error: false});
    });

    it('should fetch user and create direct message if user not found locally', async () => {
        (DatabaseManager.searchUrl as jest.Mock).mockReturnValueOnce('https://existingserver.com');
        (getActiveServerUrl as jest.Mock).mockResolvedValueOnce('https://existingserver.com');
        (queryUsersByUsername as jest.Mock).mockReturnValueOnce({fetchIds: jest.fn(() => [])});
        (fetchUsersByUsernames as jest.Mock).mockResolvedValueOnce({users: [{id: 'user-id'}]});
        const result = await handleDeepLink('https://existingserver.com/team/messages/@user-id', intl);
        expect(makeDirectChannel).toHaveBeenCalledWith('https://existingserver.com', 'user-id', '', true);
        expect(result).toEqual({error: false});
    });

    it('should show unknown user error if user not found', async () => {
        (DatabaseManager.searchUrl as jest.Mock).mockReturnValueOnce('https://existingserver.com');
        (getActiveServerUrl as jest.Mock).mockResolvedValueOnce('https://existingserver.com');
        (queryUsersByUsername as jest.Mock).mockReturnValueOnce({fetchIds: jest.fn(() => [])});
        (fetchUsersByUsernames as jest.Mock).mockResolvedValueOnce({users: []});
        const result = await handleDeepLink('https://existingserver.com/team/messages/@user-id', intl);
        expect(errorUnkownUser).toHaveBeenCalledWith(intl);
        expect(result).toEqual({error: false});
    });

    it('should switch to group message channel for GroupMessage deep link', async () => {
        (DatabaseManager.searchUrl as jest.Mock).mockReturnValueOnce('https://existingserver.com');
        (getActiveServerUrl as jest.Mock).mockResolvedValueOnce('https://existingserver.com');
        const result = await handleDeepLink('https://existingserver.com/team/messages/7b35c77a645e1906e03a2c330f89203385db102f', intl);
        expect(switchToChannelByName).toHaveBeenCalledWith('https://existingserver.com', '7b35c77a645e1906e03a2c330f89203385db102f', 'team', errorBadChannel, intl);
        expect(result).toEqual({error: false});
    });

    it('should show permalink for Permalink deep link', async () => {
        (DatabaseManager.searchUrl as jest.Mock).mockReturnValueOnce('https://existingserver.com');
        (getActiveServerUrl as jest.Mock).mockResolvedValueOnce('https://existingserver.com');
        const postid = '7b35c77a645e1906e03a2c330f';
        const result = await handleDeepLink(`https://existingserver.com/team/pl/${postid}`, intl);
        expect(showPermalink).toHaveBeenCalledWith('https://existingserver.com', 'team', postid);
        expect(result).toEqual({error: false});
    });

    it('should log error and return error true on failure', async () => {
        (getActiveServerUrl as jest.Mock).mockImplementationOnce(() => {
            throw new Error('DB does not exist error');
        });
        const result = await handleDeepLink('https://existingserver.com/team/messages/7b35c77a645e1906e03a2c330f89203385db102f');
        expect(logError).toHaveBeenCalledWith('Failed to open channel from deeplink', expect.any(Error), undefined);
        expect(result).toEqual({error: true});
    });
});

describe('getLaunchPropsFromDeepLink', () => {
    it('should return launch props with launchError when deep link is invalid', () => {
        const result = getLaunchPropsFromDeepLink('invalid-url');

        expect(result).toEqual({
            launchType: Launch.DeepLink,
            coldStart: false,
            launchError: true,
            extra: {
                type: DeepLink.Invalid,
                url: 'invalid-url',
            },
        });
    });

    it('should return launch props with extra data when deep link is valid', () => {
        const extraData = {
            type: DeepLink.Channel,
            data: {
                channelName: 'town-square',
                serverUrl: 'existingserver.com',
                teamName: 'team',
            },
            url: 'https://existingserver.com/team/channels/town-square',
        };
        const result = getLaunchPropsFromDeepLink('https://existingserver.com/team/channels/town-square', true);

        expect(result).toEqual({
            launchType: Launch.DeepLink,
            coldStart: true,
            extra: extraData,
        });
    });

    it('should return launch props with extra data to add a new server when opened from cold start', () => {
        const extraData = {
            type: DeepLink.Server,
            data: {
                serverUrl: 'existingserver.com',
            },
            url: 'https://existingserver.com/login',
        };
        const result = getLaunchPropsFromDeepLink('https://existingserver.com/login', true);

        expect(result).toEqual({
            launchType: Launch.DeepLink,
            coldStart: true,
            extra: extraData,
        });
    });
});

describe('alertInvalidDeepLink', () => {
    it('should call alertErrorWithFallback with correct arguments', () => {
        const intl = createIntl({locale: 'en', messages: {}});
        const message = {
            id: 'mobile.deep_link.invalid',
            defaultMessage: 'This link you are trying to open is invalid.',
        };

        (t as jest.Mock).mockReturnValue(message.id);

        alertInvalidDeepLink(intl);

        expect(alertErrorWithFallback).toHaveBeenCalledWith(intl, {}, message);
    });
});
