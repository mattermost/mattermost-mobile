// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {Sso} from '@constants';
import LaunchType from '@constants/launch';
import Preferences from '@constants/preferences';
import IntuneManager from '@managers/intune_manager';
import {renderWithIntl} from '@test/intl-test-helper';

import SsoScreen from './index';

jest.mock('@actions/remote/session', () => ({
    nativeEntraLogin: jest.fn(),
    ssoLogin: jest.fn(),
    ssoLoginWithCodeExchange: jest.fn(),
}));
jest.mock('@hooks/android_back_handler', () => jest.fn());
jest.mock('@hooks/screen_transition_animation', () => ({useScreenTransitionAnimation: jest.fn(() => ({}))}));
jest.mock('@init/credentials', () => ({getPreauthSecret: jest.fn()}));
jest.mock('@managers/intune_manager', () => ({
    __esModule: true,
    default: {isIntuneEnabledForConfigAndLicense: jest.fn()},
}));
jest.mock('@screens/background', () => ({__esModule: true, default: () => null}));
jest.mock('@screens/navigation', () => ({navigateBack: jest.fn(), navigateToScreen: jest.fn()}));
jest.mock('./sso_intune', () => {
    const {View} = require('react-native');
    return {__esModule: true, default: () => <View testID='sso_intune'/>};
});
jest.mock('./sso_authentication', () => {
    const {View} = require('react-native');
    return {__esModule: true, default: () => <View testID='sso_authentication'/>};
});
jest.mock('./sso_authentication_with_external_browser', () => {
    const {View} = require('react-native');
    return {__esModule: true, default: () => <View testID='sso_authentication_with_external_browser'/>};
});

describe('SSO authentication selection', () => {
    const baseProps = {
        config: {
            IntuneMAMEnabled: 'true',
            IntuneAuthService: Sso.OFFICE365,
            IntuneScope: 'api://scope/.default',
        },
        license: {IsLicensed: 'true', SkuShortName: 'advanced'},
        serverDisplayName: 'Server',
        serverUrl: 'https://example.mattermost.com',
        ssoType: Sso.OFFICE365,
        theme: Preferences.THEMES.denim,
        launchType: LaunchType.Normal,
    };

    beforeEach(() => {
        jest.mocked(IntuneManager.isIntuneEnabledForConfigAndLicense).mockReturnValue(true);
    });

    test('should use the native Entra sign-in when Intune is enabled for the config and license', () => {
        const {getByTestId, queryByTestId} = renderWithIntl(<SsoScreen {...baseProps}/>);

        expect(IntuneManager.isIntuneEnabledForConfigAndLicense).toHaveBeenCalledWith(baseProps.config, baseProps.license);
        expect(getByTestId('sso_intune')).toBeTruthy();
        expect(queryByTestId('sso_authentication')).toBeNull();
    });

    test('should fall back to the browser sign-in when Intune is not available in this build', () => {
        jest.mocked(IntuneManager.isIntuneEnabledForConfigAndLicense).mockReturnValue(false);

        const {getByTestId, queryByTestId} = renderWithIntl(<SsoScreen {...baseProps}/>);

        expect(queryByTestId('sso_intune')).toBeNull();
        expect(getByTestId('sso_authentication')).toBeTruthy();
    });

    test('should use the browser sign-in for an SSO type other than the Intune auth service', () => {
        const {getByTestId, queryByTestId} = renderWithIntl(
            <SsoScreen
                {...baseProps}
                ssoType={Sso.OPENID}
            />,
        );

        expect(queryByTestId('sso_intune')).toBeNull();
        expect(getByTestId('sso_authentication')).toBeTruthy();
    });
});
