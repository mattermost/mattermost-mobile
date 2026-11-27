// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {createIntl} from 'react-intl';
import {Alert} from 'react-native';

import {joinIfNeededAndSwitchToChannel, makeDirectChannel} from '@actions/remote/channel';
import {showPermalink} from '@actions/remote/permalink';
import {mobileQrLogin} from '@actions/remote/session';
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
import {navigateToRoot} from '@screens/navigation';
import {NavigationStore} from '@store/navigation_store';
import TestHelper from '@test/test_helper';
import {logError} from '@utils/log';
import {addNewServer} from '@utils/server';

import {alertErrorWithFallback, errorBadChannel, errorUnkownUser} from '../draft';

import {alertInvalidDeepLink, extractServerUrl, getLaunchPropsFromDeepLink, parseAndHandleDeepLink, parseDeepLink} from './index';

jest.mock('@actions/remote/user', () => ({
    fetchUsersByUsernames: jest.fn(),
}));

jest.mock('@actions/remote/session', () => ({
    magicLinkLogin: jest.fn(),
    mobileQrLogin: jest.fn(),
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
    NavigationStore: {
        getVisibleScreen: jest.fn(),
        hasModalsOpened: jest.fn(() => false),
        waitUntilScreenHasLoaded: jest.fn(),
        getScreensInStack: jest.fn().mockReturnValue([]),
    },
}));

jest.mocked(NavigationStore.getVisibleScreen).mockReturnValue(Screens.HOME);

jest.mock('@utils/server', () => ({
    addNewServer: jest.fn(),
}));

jest.mock('@actions/remote/channel', () => ({
    makeDirectChannel: jest.fn(),
    joinIfNeededAndSwitchToChannel: jest.fn(),
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
jest.mock('@screens/navigation');

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
        expect(navigateToRoot).toHaveBeenCalled();
        expect(DatabaseManager.setActiveServerDatabase).toHaveBeenCalledWith('https://existingserver.com');
        expect(WebsocketManager.initializeClient).toHaveBeenCalledWith('https://existingserver.com', 'DeepLink');
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
        expect(joinIfNeededAndSwitchToChannel).toHaveBeenCalledWith('https://existingserver.com', {name: 'town-square'}, {name: 'team'}, errorBadChannel, intl);
        expect(result).toEqual({error: false});
    });

    it('should provide the ID for an ID-shaped Channel deep link', async () => {
        jest.mocked(DatabaseManager.searchUrl).mockReturnValueOnce('https://existingserver.com');
        jest.mocked(getActiveServerUrl).mockResolvedValueOnce('https://existingserver.com');
        const channelId = '7b35c77a645e1906e03a2c330f';
        const result = await parseAndHandleDeepLink(`https://existingserver.com/team/channels/${channelId}`, intl);
        expect(joinIfNeededAndSwitchToChannel).toHaveBeenCalledWith('https://existingserver.com', {id: channelId, name: channelId}, {name: 'team'}, errorBadChannel, intl);
        expect(result).toEqual({error: false});
    });

    it('should create direct message for DirectMessage deep link', async () => {
        jest.mocked(DatabaseManager.searchUrl).mockReturnValueOnce('https://existingserver.com');
        jest.mocked(getActiveServerUrl).mockResolvedValueOnce('https://existingserver.com');
        (queryUsersByUsername as jest.Mock).mockReturnValueOnce(TestHelper.fakeQuery([TestHelper.fakeUserModel({id: 'user-id'})]));
        const result = await parseAndHandleDeepLink('https://existingserver.com/team/messages/@user-id', intl);
        expect(makeDirectChannel).toHaveBeenCalledWith('https://existingserver.com', 'user-id', '', true);
        expect(result).toEqual({error: false});
    });

    it('should fetch user and create direct message if user not found locally', async () => {
        jest.mocked(DatabaseManager.searchUrl).mockReturnValueOnce('https://existingserver.com');
        jest.mocked(getActiveServerUrl).mockResolvedValueOnce('https://existingserver.com');
        jest.mocked(fetchUsersByUsernames).mockResolvedValueOnce({users: [TestHelper.fakeUser({id: 'user-id'})]});
        jest.mocked(queryUsersByUsername).mockReturnValueOnce(TestHelper.fakeQuery([]));
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
        expect(joinIfNeededAndSwitchToChannel).toHaveBeenCalledWith('https://existingserver.com', {name: '7b35c77a645e1906e03a2c330f89203385db102f'}, {name: 'team'}, errorBadChannel, intl);
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
            intl.formatMessage({id: 'playbooks.only_runs_available.description', defaultMessage: 'Only Playbook Checklists are available on mobile. To access the Playbook, please use the desktop or web app.'}),
            [{text: intl.formatMessage({id: 'playbooks.only_runs_available.ok', defaultMessage: 'OK'})}],
        );
    });

    it('should alert when PlaybookRunsRetrospective deep link is used', async () => {
        const alertSpy = jest.spyOn(Alert, 'alert');
        jest.mocked(DatabaseManager.searchUrl).mockReturnValueOnce('https://existingserver.com');
        jest.mocked(getActiveServerUrl).mockResolvedValueOnce('https://existingserver.com');
        await parseAndHandleDeepLink('https://existingserver.com/playbooks/runs/7b35c77a645e1906e03a2c330f/retrospective', intl);
        expect(alertSpy).toHaveBeenCalledWith(
            intl.formatMessage({id: 'playbooks.retrospective_not_available.title', defaultMessage: 'Playbooks Retrospective not available'}),
            intl.formatMessage({id: 'playbooks.retrospective_not_available.description', defaultMessage: 'Only Playbook Checklists are available on mobile. To fill the Run Retrospective, please use the desktop or web app.'}),
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
        expect(goToPlaybookRun).toHaveBeenCalledWith('7b35c77a645e1906e03a2c330f');
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
            intl.formatMessage({id: 'playbooks.fetch_error.title', defaultMessage: 'Unable to open Checklist'}),
            intl.formatMessage({id: 'playbooks.fetch_error.description', defaultMessage: "You don't have permission to view this, or it may no longer exist."}),
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

describe('mobile QR login deep link', () => {
    const token = 'abcdefghij0123456789abcdefghij0123456789abcdefghij0123456789abcd';
    const intl = createIntl({locale: 'en', messages: {}});
    let tokenCount = 0;

    // The handler ignores repeated links with the same token for a short time, so each test uses its own
    const nextToken = () => {
        tokenCount++;
        return `${String(tokenCount).padStart(2, '0')}${token.slice(2)}`;
    };

    describe('parseDeepLink', () => {
        it('should parse a mattermost:// link', () => {
            const url = `mattermost://qr.example.com/login/mobile_qr?t=${token}`;
            expect(parseDeepLink(url)).toEqual({
                type: DeepLink.MobileQrLogin,
                url,
                data: {serverUrl: 'qr.example.com', token},
            });
        });

        it('should parse an https link', () => {
            const url = `https://qr.example.com/login/mobile_qr?t=${token}`;
            expect(parseDeepLink(url)).toEqual({
                type: DeepLink.MobileQrLogin,
                url,
                data: {serverUrl: 'qr.example.com', token},
            });
        });

        it('should parse a link with a subpath and a port', () => {
            const url = `mattermost://qr.example.com:8065/sub/path/login/mobile_qr?t=${token}`;
            expect(parseDeepLink(url)).toEqual({
                type: DeepLink.MobileQrLogin,
                url,
                data: {serverUrl: 'qr.example.com:8065/sub/path', token},
            });
        });

        it('should be invalid when the token is missing', () => {
            const url = 'mattermost://qr.example.com/login/mobile_qr';
            expect(parseDeepLink(url)).toEqual({type: DeepLink.Invalid, url});
        });

        it.each([
            ['too short', 'abc123'],
            ['too long', `${token}a`],
            ['uppercase', token.toUpperCase()],
            ['with invalid characters', `${token.slice(1)}-`],
        ])('should be invalid when the token is %s', (_name, badToken) => {
            const url = `mattermost://qr.example.com/login/mobile_qr?t=${badToken}`;
            expect(parseDeepLink(url)).toEqual({type: DeepLink.Invalid, url});
        });

        it('should not be confused with the magic link', () => {
            expect(parseDeepLink(`mattermost://qr.example.com/login/one_time_link?t=${token}`).type).toBe(DeepLink.MagicLink);
        });
    });

    describe('handleDeepLink', () => {
        beforeEach(() => {
            jest.clearAllMocks();
            jest.mocked(getActiveServerUrl).mockResolvedValue('https://currentserver.com');
            jest.mocked(DatabaseManager.searchUrl).mockReturnValue(undefined);
            jest.mocked(mobileQrLogin).mockResolvedValue({failed: false});
        });

        it('should redeem the code when the server is not signed in', async () => {
            const qrToken = nextToken();
            const result = await parseAndHandleDeepLink(`mattermost://newserver.com/login/mobile_qr?t=${qrToken}`, intl);

            expect(mobileQrLogin).toHaveBeenCalledWith('newserver.com', qrToken);
            expect(addNewServer).not.toHaveBeenCalled();
            expect(Alert.alert).not.toHaveBeenCalled();
            expect(result).toEqual({error: false});
        });

        it('should only redeem the code once when the same link is handled twice', async () => {
            const url = `mattermost://newserver.com/login/mobile_qr?t=${nextToken()}`;
            const results = await Promise.all([
                parseAndHandleDeepLink(url, intl),
                parseAndHandleDeepLink(url, intl),
            ]);

            expect(mobileQrLogin).toHaveBeenCalledTimes(1);
            expect(results).toEqual([{error: false}, {error: false}]);
        });

        it('should alert and not redeem the code when already signed in to the server', async () => {
            jest.mocked(DatabaseManager.searchUrl).mockReturnValue('https://existingserver.com');
            const result = await parseAndHandleDeepLink(`https://existingserver.com/login/mobile_qr?t=${nextToken()}`, intl);

            expect(mobileQrLogin).not.toHaveBeenCalled();
            expect(navigateToRoot).not.toHaveBeenCalled();
            expect(DatabaseManager.setActiveServerDatabase).not.toHaveBeenCalled();
            expect(Alert.alert).toHaveBeenCalledWith(
                'Already signed in',
                'You\'re already signed in to this server. Sign out first, then scan the code again.',
                [{text: 'OK'}],
            );
            expect(result).toEqual({error: false});
        });

        it.each([
            ['401', 401, 'Sign-in code didn\'t work', 'This code has expired or was already used. Generate a new code on your computer and scan it again.'],
            ['404', 404, 'QR sign-in unavailable', 'This server doesn\'t support signing in with a QR code.'],
            ['501', 501, 'QR sign-in unavailable', 'This server doesn\'t support signing in with a QR code.'],
            ['other', 500, 'Couldn\'t sign in', 'Couldn\'t sign in. Try again.'],
        ])('should alert when the server responds with %s', async (_name, status_code, title, message) => {
            jest.mocked(mobileQrLogin).mockResolvedValue({error: {status_code}, failed: true});
            const result = await parseAndHandleDeepLink(`mattermost://newserver.com/login/mobile_qr?t=${nextToken()}`, intl);

            expect(Alert.alert).toHaveBeenCalledWith(title, message, [{text: 'OK'}]);
            expect(result).toEqual({error: true, alertShown: true});
        });

        it('should show the generic alert when the error has no status code', async () => {
            jest.mocked(mobileQrLogin).mockResolvedValue({error: 'unreachable', failed: true});
            const result = await parseAndHandleDeepLink(`mattermost://newserver.com/login/mobile_qr?t=${nextToken()}`, intl);

            expect(Alert.alert).toHaveBeenCalledWith('Couldn\'t sign in', 'Couldn\'t sign in. Try again.', [{text: 'OK'}]);
            expect(result).toEqual({error: true, alertShown: true});
        });

        it('should not alert when signed in but loading the server data failed', async () => {
            jest.mocked(mobileQrLogin).mockResolvedValue({error: 'entry failed', failed: false});
            const result = await parseAndHandleDeepLink(`mattermost://newserver.com/login/mobile_qr?t=${nextToken()}`, intl);

            expect(Alert.alert).not.toHaveBeenCalled();
            expect(result).toEqual({error: false});
        });
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
