// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {type ComponentProps} from 'react';

import PerformanceMetricsManager from '@managers/performance_metrics_manager';
import {renderWithEverything, waitFor} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import ChannelListScreen from './channel_list';

import type {Database} from '@nozbe/watermelondb';

jest.mock('@managers/performance_metrics_manager');
jest.mock('@react-navigation/native', () => ({
    useIsFocused: () => true,
    useNavigation: () => ({isFocused: () => true}),
    useRoute: () => ({}),
}));

jest.mock('@react-native-camera-roll/camera-roll', () => ({
    CameraRoll: {
        save: jest.fn().mockResolvedValue('path'),
    },
}));

jest.mock('@screens/navigation', () => ({
    resetToTeams: jest.fn(),
    openToS: jest.fn(),
    showWatermarkOverlay: jest.fn(),
    dismissWatermarkOverlay: jest.fn(),
}));

function getBaseProps(): ComponentProps<typeof ChannelListScreen> {
    return {
        hasChannels: true,
        hasCurrentUser: true,
        hasMoreThanOneTeam: true,
        hasTeams: true,
        isCRTEnabled: true,
        isLicensed: true,
        isWatermarkEnabled: false,
        launchType: 'normal',
        showIncomingCalls: true,
        showToS: false,
        currentUserId: 'someId',
    };
}

describe('performance metrics', () => {
    let database: Database;
    const serverUrl = 'http://www.someserverurl.com';
    beforeAll(async () => {
        const server = await TestHelper.setupServerDatabase(serverUrl);
        database = server.database;
    });

    it('finish load on load', async () => {
        const props = getBaseProps();
        renderWithEverything(<ChannelListScreen {...props}/>, {database, serverUrl});
        await waitFor(() => {
            expect(PerformanceMetricsManager.finishLoad).toHaveBeenCalledWith('HOME', serverUrl);
        });
    });
});

describe('watermark overlay', () => {
    let database: Database;
    const serverUrl = 'http://www.someserverurl.com';

    beforeAll(async () => {
        const server = await TestHelper.setupServerDatabase(serverUrl);
        database = server.database;
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should show the watermark overlay when isWatermarkEnabled is true', async () => {
        const {showWatermarkOverlay} = require('@screens/navigation');
        const props = {...getBaseProps(), isWatermarkEnabled: true};
        renderWithEverything(<ChannelListScreen {...props}/>, {database, serverUrl});
        await waitFor(() => {
            expect(showWatermarkOverlay).toHaveBeenCalledTimes(1);
        });
    });

    it('should not show the watermark overlay when isWatermarkEnabled is false', async () => {
        const {showWatermarkOverlay} = require('@screens/navigation');
        const props = {...getBaseProps(), isWatermarkEnabled: false};
        renderWithEverything(<ChannelListScreen {...props}/>, {database, serverUrl});
        await waitFor(() => {
            expect(showWatermarkOverlay).not.toHaveBeenCalled();
        });
    });

    it('should dismiss the watermark overlay when isWatermarkEnabled changes to false', async () => {
        const {showWatermarkOverlay, dismissWatermarkOverlay} = require('@screens/navigation');
        const props = {...getBaseProps(), isWatermarkEnabled: true};
        const {rerender} = renderWithEverything(<ChannelListScreen {...props}/>, {database, serverUrl});
        await waitFor(() => {
            expect(showWatermarkOverlay).toHaveBeenCalledTimes(1);
        });

        rerender(<ChannelListScreen {...{...props, isWatermarkEnabled: false}}/>);
        await waitFor(() => {
            expect(dismissWatermarkOverlay).toHaveBeenCalledTimes(1);
        });
    });
});
