// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {screen} from '@testing-library/react-native';
import React from 'react';

import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import About from './about';

jest.mock('expo-application', () => ({
    applicationId: 'com.encma.hxmain',
    nativeApplicationVersion: '1.0.0',
    nativeBuildVersion: '1',
}));

jest.mock('@actions/remote/license', () => ({
    getLicenseLoadMetric: jest.fn().mockResolvedValue(null),
}));

jest.mock('@context/server', () => ({
    useServerUrl: () => 'https://server.example.com',
}));

jest.mock('@hooks/device', () => ({
    useIsTablet: () => false,
}));

jest.mock('@hooks/android_back_handler', () => jest.fn());

const config = {
    SiteName: 'Mattermost',
    BuildEnterpriseReady: 'false',
    Version: '11.7.0',
    BuildNumber: '11.7.0',
    SQLDriverName: 'postgres',
    SchemaVersion: '100',
    BuildHash: 'build-hash',
    BuildHashEnterprise: 'enterprise-hash',
    BuildDate: '2026-10-29',
    TermsOfServiceLink: 'https://about.mattermost.com/default-terms/',
    PrivacyPolicyLink: 'https://about.mattermost.com/default-privacy-policy/',
} as ClientConfig;

describe('ENCMA About screen', () => {
    it('uses ENCMA branding and removes upstream promotional and default policy links', () => {
        renderWithIntlAndTheme(<About config={config}/>);

        expect(screen.getByTestId('about.logo')).toBeTruthy();
        expect(screen.getByTestId('about.title')).toHaveTextContent('ENCMA');
        expect(screen.queryByTestId('about.learn_more.text')).toBeNull();
        expect(screen.queryByTestId('about.learn_more.url')).toBeNull();
        expect(screen.queryByTestId('about.powered_by')).toBeNull();
        expect(screen.queryByTestId('about.terms_of_service')).toBeNull();
        expect(screen.queryByTestId('about.privacy_policy')).toBeNull();
    });

    it('retains copyright and open-source attribution', () => {
        renderWithIntlAndTheme(<About config={config}/>);

        expect(screen.getByTestId('about.copyright')).toHaveTextContent(/Mattermost, Inc\./);
        expect(screen.getByTestId('about.notice_text')).toHaveTextContent(/Mattermost is made possible/);
    });
});
