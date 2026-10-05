// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {defer} from 'rxjs';

import * as ChannelQueries from '@queries/servers/channel';
import {renderWithEverything, screen, waitFor} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import ChannelItem from './index';

import type Database from '@nozbe/watermelondb/Database';

describe('components/channel_item enhanced', () => {
    const serverUrl = 'http://www.channel-item-enhanced.com';
    let database: Database;

    beforeAll(async () => {
        const server = await TestHelper.setupServerDatabase(serverUrl);
        database = server.database;
    });

    afterAll(async () => {
        await TestHelper.tearDown();
    });

    it('should subscribe to the my channel record once per row', async () => {
        let myChannelSubscriptions = 0;
        const original = ChannelQueries.observeMyChannel;
        const spy = jest.spyOn(ChannelQueries, 'observeMyChannel').mockImplementation((db, channelId) => defer(() => {
            myChannelSubscriptions++;
            return original(db, channelId);
        }));

        const channel = await ChannelQueries.getChannelById(database, TestHelper.basicChannel!.id);
        renderWithEverything(
            <ChannelItem
                channel={channel!}
                onPress={jest.fn()}
                shouldHighlightState={true}
                testID='channel_item'
            />,
            {database, serverUrl},
        );

        await waitFor(() => expect(screen.getByText(channel!.displayName)).toBeTruthy());
        expect(myChannelSubscriptions).toBe(1);
        spy.mockRestore();
    });
});
