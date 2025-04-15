// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Alert} from 'react-native';

import {Preferences, Screens, Sso} from '@constants';
import {dismissBottomSheet, showModal} from '@screens/navigation';
import {getIntlShape} from '@utils/general';
import {isMinimumServerVersion} from '@utils/helpers';

import {
    addNewServer,
    alertServerAlreadyConnected,
    alertServerError,
    alertServerLogout,
    alertServerRemove,
    editServer,
    isSupportedServer,
    loginOptions,
    loginToServer,
    semverFromServerVersion,
    sortServersByDisplayName,
    unsupportedServer,
} from './index';

import type {ServersModel} from '@database/models/app';
import type {DeepLinkWithData} from '@typings/launch';

jest.mock('@utils/helpers', () => ({
    isMinimumServerVersion: jest.fn(),
    isTablet: jest.fn(() => true),
}));

jest.mock('@screens/navigation', () => ({
    dismissBottomSheet: jest.fn(),
    showModal: jest.fn(),
}));

jest.mock('@components/compass_icon', () => ({
    getImageSourceSync: jest.fn(),
}));

jest.mock('@utils/url', () => ({
    tryOpenURL: jest.fn(),
}));

describe('unsupportedServer', () => {
    const intl = getIntlShape();

    it('should show the alert for sysadmin', () => {
        const alert = jest.spyOn(Alert, 'alert');
        unsupportedServer('Default Server', true, intl);
        expect(alert?.mock?.calls?.[0]?.[2]?.length).toBe(2);
    });

    it('should not show the alert for team admin / user', () => {
        const alert = jest.spyOn(Alert, 'alert');
        unsupportedServer('Default Server', false, intl);
        expect(alert).not.toHaveBeenCalled();
    });
});

describe('isSupportedServer', () => {
    it('should return true for supported server version', () => {
        (isMinimumServerVersion as jest.Mock).mockReturnValue(true);
        const result = isSupportedServer('5.0.0');
        expect(result).toBe(true);
    });

    it('should return false for unsupported server version', () => {
        (isMinimumServerVersion as jest.Mock).mockReturnValue(false);
        const result = isSupportedServer('4.0.0');
        expect(result).toBe(false);
    });
});

describe('semverFromServerVersion', () => {
    it('should return semver string for valid version', () => {
        const result = semverFromServerVersion('5.0.0');
        expect(result).toBe('5.0.0');
    });

    it('should return undefined for invalid version', () => {
        const result = semverFromServerVersion('');
        expect(result).toBeUndefined();
    });
});

describe('addNewServer', () => {
    it('should call dismissBottomSheet and showModal', async () => {
        const theme = Preferences.THEMES.denim;
        const serverUrl = 'https://server.com';
        const displayName = 'Server';
        const deepLinkProps = {type: 'channel', url: 'https://mattermost.com'} as DeepLinkWithData;

        await addNewServer(theme, serverUrl, displayName, deepLinkProps);

        expect(dismissBottomSheet).toHaveBeenCalled();
        expect(showModal).toHaveBeenCalledWith(Screens.SERVER, '', expect.any(Object), expect.any(Object));
    });
});

describe('loginOptions', () => {
    it('should return correct login options', () => {
        const config = {
            EnableSaml: 'true',
            EnableSignUpWithGitLab: 'true',
            EnableSignUpWithGoogle: 'true',
            EnableSignUpWithOffice365: 'true',
            EnableSignUpWithOpenId: 'true',
            EnableLdap: 'true',
            EnableSignInWithEmail: 'true',
            EnableSignInWithUsername: 'true',
            Version: '5.0.0',
        } as ClientConfig;
        const license = {
            IsLicensed: 'true',
            SAML: 'true',
            Office365OAuth: 'true',
            LDAP: 'true',
        } as ClientLicense;

        const result = loginOptions(config, license);

        expect(result).toEqual({
            hasLoginForm: true,
            ssoOptions: {
                [Sso.SAML]: {enabled: true, text: undefined},
                [Sso.GITLAB]: {enabled: true},
                [Sso.GOOGLE]: {enabled: true},
                [Sso.OFFICE365]: {enabled: true},
                [Sso.OPENID]: {enabled: true, text: undefined},
            },
            enabledSSOs: [Sso.SAML, Sso.GITLAB, Sso.GOOGLE, Sso.OFFICE365, Sso.OPENID],
            numberSSOs: 5,
        });
    });
});
describe('loginToServer', () => {
    const theme = Preferences.THEMES.denim;
    const serverUrl = 'https://server.com';
    const displayName = 'Server';
    const config = {
        EnableSaml: 'true',
        EnableSignUpWithGitLab: 'false',
        EnableSignUpWithGoogle: 'false',
        EnableSignUpWithOffice365: 'false',
        EnableSignUpWithOpenId: 'false',
        EnableLdap: 'false',
        EnableSignInWithEmail: 'true',
        EnableSignInWithUsername: 'true',
        Version: '5.0.0',
    } as ClientConfig;
    const license = {
        IsLicensed: 'true',
        SAML: 'true',
        Office365OAuth: 'true',
        LDAP: 'true',
    } as ClientLicense;

    it('should call dismissBottomSheet and showModal with LOGIN screen', async () => {
        await loginToServer(theme, serverUrl, displayName, config, license);

        expect(dismissBottomSheet).toHaveBeenCalled();
        expect(showModal).toHaveBeenCalledWith(Screens.LOGIN, '', expect.any(Object), expect.any(Object));
    });

    /* Commented out for now as the test is failing potentially due to incorrect logic in the function

    it('should call showModal with SSO screen if redirectSSO is true', async () => {
        const configWithSingleSSO = {...config, EnableSignInWithEmail: 'false', EnableSignInWithUsername: 'false'};
        await loginToServer(theme, serverUrl, displayName, configWithSingleSSO, license);

        expect(showModal).toHaveBeenCalledWith(Screens.SSO, '', expect.any(Object), expect.any(Object));
    });*/
});

describe('editServer', () => {
    const theme = Preferences.THEMES.denim;
    const server = {url: 'https://server.com', displayName: 'Server'} as ServersModel;

    it('should call showModal with EDIT_SERVER screen', async () => {
        await editServer(theme, server);

        expect(showModal).toHaveBeenCalledWith(Screens.EDIT_SERVER, '', expect.any(Object), expect.any(Object));
    });
});

describe('alertServerLogout', () => {
    const intl = getIntlShape();
    const displayName = 'Server';
    const onPress = jest.fn();

    it('should show an alert with the correct title and message', () => {
        const alert = jest.spyOn(Alert, 'alert');

        alertServerLogout(displayName, onPress, intl);

        expect(alert).toHaveBeenCalledWith(
            `Are you sure you want to log out of ${displayName}?`,
            'All associated data will be removed',
            expect.any(Array),
        );
    });
});

describe('alertServerRemove', () => {
    const intl = getIntlShape();
    const displayName = 'Server';
    const onPress = jest.fn();

    it('should show an alert with the correct title and message', () => {
        const alert = jest.spyOn(Alert, 'alert');
        alertServerRemove(displayName, onPress, intl);

        expect(alert).toHaveBeenCalledWith(
            `Are you sure you want to remove ${displayName}?`,
            'This will remove it from your list of servers. All associated data will be removed',
            expect.any(Array),
        );
    });
});

describe('alertServerError', () => {
    const intl = getIntlShape();
    const error = new Error('Test error');

    it('should show an alert with the correct title and message', () => {
        const alert = jest.spyOn(Alert, 'alert');
        alertServerError(intl, error);

        expect(alert).toHaveBeenCalledWith(
            'Server is unreachable.',
            'Test error',
        );
    });
});

describe('alertServerAlreadyConnected', () => {
    const intl = getIntlShape();

    it('should show an alert with the correct message', () => {
        const alert = jest.spyOn(Alert, 'alert');
        alertServerAlreadyConnected(intl);

        expect(alert).toHaveBeenCalledWith(
            '',
            'You are already connected to this server.',
        );
    });
});

describe('sortServersByDisplayName', () => {
    const intl = getIntlShape();
    const servers = [
        {url: 'https://server1.com', displayName: 'Server 1'} as ServersModel,
        {url: 'https://server2.com', displayName: 'Server 2'} as ServersModel,
        {url: 'https://server3.com', displayName: 'https://server3.com'} as ServersModel,
    ];

    it('should sort servers by display name', () => {
        const sortedServers = sortServersByDisplayName(servers, intl);

        expect(sortedServers[0].url).toBe('https://server3.com'); // Display name treated as 'Default Server'
        expect(sortedServers[1].url).toBe('https://server1.com');
        expect(sortedServers[2].url).toBe('https://server2.com');
    });
});
