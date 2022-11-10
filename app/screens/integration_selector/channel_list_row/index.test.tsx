// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Database from '@nozbe/watermelondb/Database';
import React from 'react';

import {Preferences} from '@app/constants';
import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import ChannelListRow from '.';

describe('components/integration_selector/channel_list_row', () => {
    let database: Database;
    beforeAll(async () => {
        const server = await TestHelper.setupServerDatabase();
        database = server.database;
    });

    it('should render', () => {
        const channel: Channel = {
            id: '1',
            create_at: 1111,
            update_at: 1111,
            delete_at: 1111,
            team_id: 'my team',
            type: 'O',
            display_name: 'channel',
            name: 'channel',
            header: 'channel',
            purpose: 'channel',
            last_post_at: 1,
            total_msg_count: 1,
            extra_update_at: 1,
            creator_id: '1',
            scheme_id: null,
            group_constrained: null,
            shared: true,
        };
        const wrapper = renderWithEverything(
            <ChannelListRow
                id='1234'
                isArchived={false}
                theme={Preferences.THEMES.denim}
                channel={channel}
                teammateNameDisplay='dummy'
                testID='ChannelListRow'
                onPress={(item: Channel) => {
                    console.log(item);
                }}
            />,
            {database},
        );

        expect(wrapper.toJSON()).toBeTruthy();
    });
});
