// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {screen, waitFor} from '@testing-library/react-native';
import React from 'react';

import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import About from './about';

import type {AvailableScreens} from '@typings/screens/navigation';

jest.mock('@hooks/android_back_handler', () => jest.fn());

jest.mock('@context/server', () => ({
    useServerUrl: jest.fn(() => 'https://test.mattermost.com'),
}));

jest.mock('@hooks/utils', () => ({
    usePreventDoubleTap: jest.fn((callback) => callback),
}));

jest.mock('@actions/remote/license', () => ({
    getLicenseLoadMetric: jest.fn(() => Promise.resolve(null)),
}));

describe('About', () => {
    const baseConfig: ClientConfig = {
        Version: '9.5.0',
        BuildNumber: '9.5.0.12345',
        BuildDate: '2024-01-01',
        BuildHash: 'abc123',
        BuildHashEnterprise: 'def456',
        SQLDriverName: 'postgres',
        SchemaVersion: '123',
        SiteName: 'Test Server',
    } as ClientConfig;

    const defaultProps = {
        componentId: 'About' as AvailableScreens,
        config: baseConfig,
        license: undefined,
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('rendering', () => {
        it('should render about screen', async () => {
            renderWithIntlAndTheme(<About {...defaultProps}/>);

            await waitFor(() => {
                expect(screen.getByTestId('about.screen')).toBeTruthy();
            });
        });

        it('should render server version', async () => {
            renderWithIntlAndTheme(<About {...defaultProps}/>);

            await waitFor(() => {
                expect(screen.getByTestId('about.server_version.value')).toBeTruthy();
            });
        });
    });

    describe('FIPS indicator', () => {
        it('should show FIPS indicator when IsFipsEnabled is true', async () => {
            const fipsConfig = {
                ...baseConfig,
                IsFipsEnabled: 'true',
            };

            renderWithIntlAndTheme(
                <About
                    {...defaultProps}
                    config={fipsConfig}
                />,
            );

            await waitFor(() => {
                const serverVersionElement = screen.getByTestId('about.server_version.value');
                expect(serverVersionElement.props.children).toContain('(FIPS)');
            });
        });

        it('should not show FIPS indicator when IsFipsEnabled is false', async () => {
            const nonFipsConfig = {
                ...baseConfig,
                IsFipsEnabled: 'false',
            };

            renderWithIntlAndTheme(
                <About
                    {...defaultProps}
                    config={nonFipsConfig}
                />,
            );

            await waitFor(() => {
                const serverVersionElement = screen.getByTestId('about.server_version.value');
                expect(serverVersionElement.props.children).not.toContain('(FIPS)');
            });
        });

        it('should not show FIPS indicator when IsFipsEnabled is not set', async () => {
            const configWithoutFips = {
                ...baseConfig,
            };

            renderWithIntlAndTheme(
                <About
                    {...defaultProps}
                    config={configWithoutFips}
                />,
            );

            await waitFor(() => {
                const serverVersionElement = screen.getByTestId('about.server_version.value');
                expect(serverVersionElement.props.children).not.toContain('(FIPS)');
            });
        });
    });
});
