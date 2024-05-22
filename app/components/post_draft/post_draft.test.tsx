// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {type ComponentProps} from 'react';

import NetworkManager from '@managers/network_manager';
import PerformanceMetricsManager from '@managers/performance_metrics_manager';
import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import PostDraft from './post_draft';

import type {Database} from '@nozbe/watermelondb';

jest.mock('@managers/performance_metrics_manager');

function getBaseProps(): ComponentProps<typeof PostDraft> {
    return {
        canPost: true,
        channelId: '',
        channelIsReadOnly: false,
        containerHeight: 0,
        deactivatedChannel: false,
        isChannelScreen: true,
        keyboardTracker: {current: null},
        accessoriesContainerID: '',
        canShowPostPriority: false,
        channelIsArchived: false,
    };
}

describe('performance metrics', () => {
    let database: Database;
    const serverUrl = 'http://www.someserverurl.com';
    beforeEach(async () => {
        const client = await NetworkManager.createClient(serverUrl);
        expect(client).toBeTruthy();
        database = (await TestHelper.setupServerDatabase(serverUrl)).database;
    });

    afterEach(async () => {
        await TestHelper.tearDown();
        NetworkManager.invalidateClient(serverUrl);
    });

    it('on channel', () => {
        const props = getBaseProps();
        renderWithEverything(<PostDraft {...props}/>, {database, serverUrl});
        expect(PerformanceMetricsManager.finishLoad).toHaveBeenCalledWith('CHANNEL', serverUrl);
        expect(PerformanceMetricsManager.endMetric).toHaveBeenCalledWith('mobile_channel_switch', serverUrl);
    });
    it('on thread', () => {
        const props = getBaseProps();
        props.rootId = 'someId';
        renderWithEverything(<PostDraft {...props}/>, {database, serverUrl});
        expect(PerformanceMetricsManager.finishLoad).toHaveBeenCalledWith('THREAD', serverUrl);
        expect(PerformanceMetricsManager.endMetric).toHaveBeenCalledWith('mobile_channel_switch', serverUrl);
    });
});
