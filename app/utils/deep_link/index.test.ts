// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {createIntl} from 'react-intl';
import {Alert} from 'react-native';
import {Navigation} from 'react-native-navigation';

import {makeDirectChannel, switchToChannelByName} from '@actions/remote/channel';
import {showPermalink} from '@actions/remote/permalink';
import {fetchUsersByUsernames} from '@actions/remote/user';
import {DeepLink, Launch, Preferences, Screens} from '@constants';
import DatabaseManager from '@database/manager';
import WebsocketManager from '@managers/websocket_manager';
import {fetchPlaybookRun} from '@playbooks/actions/remote/runs';
import {getPlaybookRunById} from '@playbooks/database/queries/run';
import {fetchIsPlaybooksEnabled} from '@playbooks/database/queries/version';
import {goToPlaybookRun} from '@playbooks/screens/navigation';
import {getActiveServerUrl} from '@queries/app/servers';
import {queryUsersByUsername} from '@queries/servers/user';
import {dismissAllModalsAndPopToRoot} from '@screens/navigation';
import NavigationStore from '@store/navigation_store';
import TestHelper from '@test/test_helper';
import {logError} from '@utils/log';
import {addNewServer} from '@utils/server';

import {alertErrorWithFallback, errorBadChannel, errorUnkownUser} from '../draft';

import {alertInvalidDeepLink, extractServerUrl, getLaunchPropsFromDeepLink, parseAndHandleDeepLink} from '.';

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

jest.mock('@playbooks/database/queries/version');
jest.mock('@playbooks/database/queries/run');
jest.mock('@playbooks/actions/remote/runs');
jest.mock('@playbooks/screens/navigation');

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

describe('parseAndHandleDeepLink', () => {
    const intl = createIntl({locale: 'en', messages: {}});

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return error for invalid deep link', async () => {
        const result = await parseAndHandleDeepLink('invalid-url');
        expect(result).toEqual({error: true});
    });

    it('should add new server if not existing', async () => {
        jest.mocked(getActiveServerUrl).mockResolvedValueOnce('https://currentserver.com');
        jest.mocked(DatabaseManager.searchUrl).mockReturnValueOnce('');
        const result = await parseAndHandleDeepLink('https://newserver.com/team/channels/town-square');
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
        jest.mocked(getActiveServerUrl).mockResolvedValueOnce('https://currentserver.com');
        jest.mocked(DatabaseManager.searchUrl).mockReturnValueOnce('https://existingserver.com');
        const result = await parseAndHandleDeepLink('https://existingserver.com/team/channels/town-square');
        expect(dismissAllModalsAndPopToRoot).toHaveBeenCalled();
        expect(DatabaseManager.setActiveServerDatabase).toHaveBeenCalledWith('https://existingserver.com');
        expect(WebsocketManager.initializeClient).toHaveBeenCalledWith('https://existingserver.com', 'DeepLink');
        expect(result).toEqual({error: false});
    });

    it('should update the server url in the server url screen', async () => {
        jest.mocked(getActiveServerUrl).mockResolvedValueOnce('https://currentserver.com');
        jest.mocked(DatabaseManager.searchUrl).mockReturnValueOnce(undefined);

        jest.mocked(NavigationStore.getVisibleScreen).mockReturnValueOnce(Screens.SERVER);
        const result = await parseAndHandleDeepLink('https://currentserver.com/team/channels/town-square', undefined, undefined, true);
        const spyOnUpdateProps = jest.spyOn(Navigation, 'updateProps');
        expect(spyOnUpdateProps).toHaveBeenCalledWith(Screens.SERVER, {serverUrl: 'currentserver.com'});
        expect(result).toEqual({error: false});
    });

    it('should not display the new server modal if the server screen is on the stack but not as the visible screen', async () => {
        jest.mocked(getActiveServerUrl).mockResolvedValueOnce('https://currentserver.com');
        jest.mocked(DatabaseManager.searchUrl).mockReturnValueOnce(undefined);

        jest.mocked(NavigationStore.getVisibleScreen).mockReturnValueOnce(Screens.LOGIN);
        jest.mocked(NavigationStore.getScreensInStack).mockReturnValueOnce([Screens.SERVER, Screens.LOGIN]);
        const result = await parseAndHandleDeepLink('https://currentserver.com/team/channels/town-square', undefined, undefined, true);
        expect(addNewServer).not.toHaveBeenCalled();
        expect(result).toEqual({error: false});
    });

    it('should switch to channel by name for Channel deep link', async () => {
        jest.mocked(DatabaseManager.searchUrl).mockReturnValueOnce('https://existingserver.com');
        jest.mocked(getActiveServerUrl).mockResolvedValueOnce('https://existingserver.com');
        const result = await parseAndHandleDeepLink('https://existingserver.com/team/channels/town-square', intl);
        expect(switchToChannelByName).toHaveBeenCalledWith('https://existingserver.com', 'town-square', 'team', errorBadChannel, intl);
        expect(result).toEqual({error: false});
    });

    it('should create direct message for DirectMessage deep link', async () => {
        jest.mocked(DatabaseManager.searchUrl).mockReturnValueOnce('https://existingserver.com');
        jest.mocked(getActiveServerUrl).mockResolvedValueOnce('https://existingserver.com');
        jest.mocked(queryUsersByUsername).mockReturnValueOnce(TestHelper.fakeQuery([TestHelper.fakeUserModel({id: 'user-id'})]));
        const result = await parseAndHandleDeepLink('https://existingserver.com/team/messages/@user-id', intl);
        expect(makeDirectChannel).toHaveBeenCalledWith('https://existingserver.com', 'user-id', '', true);
        expect(result).toEqual({error: false});
    });

    it('should fetch user and create direct message if user not found locally', async () => {
        jest.mocked(DatabaseManager.searchUrl).mockReturnValueOnce('https://existingserver.com');
        jest.mocked(getActiveServerUrl).mockResolvedValueOnce('https://existingserver.com');
        jest.mocked(queryUsersByUsername).mockReturnValueOnce(TestHelper.fakeQuery([]));
        jest.mocked(fetchUsersByUsernames).mockResolvedValueOnce({users: [TestHelper.fakeUser({id: 'user-id'})]});
        const result = await parseAndHandleDeepLink('https://existingserver.com/team/messages/@user-id', intl);
        expect(makeDirectChannel).toHaveBeenCalledWith('https://existingserver.com', 'user-id', '', true);
        expect(result).toEqual({error: false});
    });

    it('should show unknown user error if user not found', async () => {
        jest.mocked(DatabaseManager.searchUrl).mockReturnValueOnce('https://existingserver.com');
        jest.mocked(getActiveServerUrl).mockResolvedValueOnce('https://existingserver.com');
        jest.mocked(queryUsersByUsername).mockReturnValueOnce(TestHelper.fakeQuery([]));
        jest.mocked(fetchUsersByUsernames).mockResolvedValueOnce({users: []});
        const result = await parseAndHandleDeepLink('https://existingserver.com/team/messages/@user-id', intl);
        expect(errorUnkownUser).toHaveBeenCalledWith(intl);
        expect(result).toEqual({error: false});
    });

    it('should switch to group message channel for GroupMessage deep link', async () => {
        jest.mocked(DatabaseManager.searchUrl).mockReturnValueOnce('https://existingserver.com');
        jest.mocked(getActiveServerUrl).mockResolvedValueOnce('https://existingserver.com');
        const result = await parseAndHandleDeepLink('https://existingserver.com/team/messages/7b35c77a645e1906e03a2c330f89203385db102f', intl);
        expect(switchToChannelByName).toHaveBeenCalledWith('https://existingserver.com', '7b35c77a645e1906e03a2c330f89203385db102f', 'team', errorBadChannel, intl);
        expect(result).toEqual({error: false});
    });

    it('should show permalink for Permalink deep link', async () => {
        jest.mocked(DatabaseManager.searchUrl).mockReturnValueOnce('https://existingserver.com');
        jest.mocked(getActiveServerUrl).mockResolvedValueOnce('https://existingserver.com');
        const postid = '7b35c77a645e1906e03a2c330f';
        const result = await parseAndHandleDeepLink(`https://existingserver.com/team/pl/${postid}`, intl);
        expect(showPermalink).toHaveBeenCalledWith('https://existingserver.com', 'team', postid);
        expect(result).toEqual({error: false});
    });

    it('should log error and return error true on failure', async () => {
        jest.mocked(getActiveServerUrl).mockImplementationOnce(() => {
            throw new Error('DB does not exist error');
        });
        const result = await parseAndHandleDeepLink('https://existingserver.com/team/messages/7b35c77a645e1906e03a2c330f89203385db102f');
        expect(logError).toHaveBeenCalledWith('Failed to open channel from deeplink', expect.any(Error), undefined);
        expect(result).toEqual({error: true});
    });

    it('should alert when Playbooks deep link is used', async () => {
        const alertSpy = jest.spyOn(Alert, 'alert');
        jest.mocked(DatabaseManager.searchUrl).mockReturnValueOnce('https://existingserver.com');
        jest.mocked(getActiveServerUrl).mockResolvedValueOnce('https://existingserver.com');
        await parseAndHandleDeepLink('https://existingserver.com/playbooks/playbooks/7b35c77a645e1906e03a2c330f', intl);
        expect(alertSpy).toHaveBeenCalledWith(
            intl.formatMessage({id: 'playbooks.only_runs_available.title', defaultMessage: 'Playbooks not available'}),
            intl.formatMessage({id: 'playbooks.only_runs_available.description', defaultMessage: 'Only Playbook Runs are available on mobile. To access the Playbook, please use the desktop or web app.'}),
            [{text: intl.formatMessage({id: 'playbooks.only_runs_available.ok', defaultMessage: 'OK'})}],
        );
    });

    it('should alert when PlaybookRunsRetrospective deep link is used', async () => {
        const alertSpy = jest.spyOn(Alert, 'alert');
        jest.mocked(DatabaseManager.searchUrl).mockReturnValueOnce('https://existingserver.com');
        jest.mocked(getActiveServerUrl).mockResolvedValueOnce('https://existingserver.com');
        await parseAndHandleDeepLink('https://existingserver.com/playbooks/runs/7b35c77a645e1906e03a2c330f/retrospective', intl);
        expect(alertSpy).toHaveBeenCalledWith(
            intl.formatMessage({id: 'playbooks.retrospective_not_available.title', defaultMessage: 'Playbooks Run Retrospective not available'}),
            intl.formatMessage({id: 'playbooks.retrospective_not_available.description', defaultMessage: 'Only Playbook Runs are available on mobile. To fill the Run Retrospective, please use the desktop or web app.'}),
            [{text: intl.formatMessage({id: 'playbooks.retrospective_not_available.ok', defaultMessage: 'OK'})}],
        );
    });

    it('should go to playbook run if enabled and playbook exists', async () => {
        jest.mocked(DatabaseManager.searchUrl).mockReturnValueOnce('https://existingserver.com');
        jest.mocked(getActiveServerUrl).mockResolvedValueOnce('https://existingserver.com');
        jest.mocked(fetchIsPlaybooksEnabled).mockResolvedValue(true);
        jest.mocked(getPlaybookRunById).mockResolvedValue(TestHelper.fakePlaybookRunModel({id: '7b35c77a645e1906e03a2c330f'}));
        jest.mocked(goToPlaybookRun).mockImplementation(jest.fn());

        // Re-import to apply mocks
        await parseAndHandleDeepLink('https://existingserver.com/playbooks/runs/7b35c77a645e1906e03a2c330f', intl);
        expect(goToPlaybookRun).toHaveBeenCalledWith(intl, '7b35c77a645e1906e03a2c330f');
    });

    it('should fetch playbook run if not found locally and show error if fetch fails', async () => {
        const alertSpy = jest.spyOn(Alert, 'alert');
        jest.mocked(DatabaseManager.searchUrl).mockReturnValueOnce('https://existingserver.com');
        jest.mocked(getActiveServerUrl).mockResolvedValueOnce('https://existingserver.com');
        jest.mocked(fetchIsPlaybooksEnabled).mockResolvedValue(true);
        jest.mocked(getPlaybookRunById).mockResolvedValue(undefined);
        jest.mocked(fetchPlaybookRun).mockResolvedValue({error: true});

        // Re-import to apply mocks
        await parseAndHandleDeepLink('https://existingserver.com/playbooks/runs/7b35c77a645e1906e03a2c330f', intl);
        expect(alertSpy).toHaveBeenCalledWith(
            intl.formatMessage({id: 'playbooks.fetch_error.title', defaultMessage: 'Unable to open Run'}),
            intl.formatMessage({id: 'playbooks.fetch_error.description', defaultMessage: "You don't have permission to view this run, or it may no longer exist."}),
            [{text: intl.formatMessage({id: 'playbooks.fetch_error.OK', defaultMessage: 'Okay'})}],
        );
    });

    it('should alert if playbooks are not enabled or version not supported', async () => {
        const alertSpy = jest.spyOn(Alert, 'alert');
        jest.mocked(DatabaseManager.searchUrl).mockReturnValueOnce('https://existingserver.com');
        jest.mocked(getActiveServerUrl).mockResolvedValueOnce('https://existingserver.com');
        jest.mocked(fetchIsPlaybooksEnabled).mockResolvedValue(false);

        // Re-import to apply mocks
        await parseAndHandleDeepLink('https://existingserver.com/playbooks/runs/7b35c77a645e1906e03a2c330f', intl);
        expect(alertSpy).toHaveBeenCalledWith(
            intl.formatMessage({id: 'playbooks.not_enabled_or_unsupported.title', defaultMessage: 'Playbooks not available'}),
            intl.formatMessage({id: 'playbooks.not_enabled_or_unsupported.description', defaultMessage: 'Playbooks are either not enabled on this server or the Playbooks version is not supported. Please contact your system administrator.'}),
            [{text: intl.formatMessage({id: 'playbooks.not_enabled_or_unsupported.OK', defaultMessage: 'OK'})}],
        );
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

        alertInvalidDeepLink(intl);

        expect(alertErrorWithFallback).toHaveBeenCalledWith(intl, {}, message);
    });
});
