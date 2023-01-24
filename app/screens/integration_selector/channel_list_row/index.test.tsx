// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {Preferences} from '@constants';
import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import ChannelListRow from '.';

import type Database from '@nozbe/watermelondb/Database';

describe('components/integration_selector/channel_list_row', () => {
    let database: Database;
    const channel: Channel = {
        id: '1',
        create_at: 1111,
        update_at: 1111,
        delete_at: 0,
        team_id: 'my team',
        type: 'O',
        display_name: 'channel',
        name: 'channel',
        header: 'channel',
        purpose: '',
        last_post_at: 1,
        total_msg_count: 1,
        extra_update_at: 1,
        creator_id: '1',
        scheme_id: null,
        group_constrained: null,
        shared: true,
    };
    beforeAll(async () => {
        const server = await TestHelper.setupServerDatabase();
        database = server.database;
    });

    it('should match snapshot with open channel icon', () => {
        const wrapper = renderWithEverything(
            <ChannelListRow
                id='1234'
                theme={Preferences.THEMES.denim}
                channel={channel}
                selected={false}
                selectable={false}
                enabled={true}
                testID='ChannelListRow'
                onPress={() => {
                    // noop
                }}
            >
                <br/>
            </ChannelListRow>,
            {database},
        );

        expect(wrapper.toJSON()).toMatchSnapshot();
    });

    it('should match snapshot with private channel icon', () => {
        channel.type = 'P';

        const wrapper = renderWithEverything(
            <ChannelListRow
                id='1234'
                theme={Preferences.THEMES.denim}
                channel={channel}
                selected={false}
                selectable={false}
                enabled={true}
                testID='ChannelListRow'
                onPress={() => {
                    // noop
                }}
            >
                <br/>
            </ChannelListRow>,
            {database},
        );

        expect(wrapper.toJSON()).toMatchSnapshot();
    });

    it('should match snapshot with delete_at filled in', () => {
        channel.delete_at = 1111;
        channel.shared = false;

        const wrapper = renderWithEverything(
            <ChannelListRow
                id='1234'
                theme={Preferences.THEMES.denim}
                channel={channel}
                testID='ChannelListRow'
                enabled={true}
                selectable={false}
                selected={false}
                onPress={() => {
                    // noop
                }}
            >
                <br/>
            </ChannelListRow>,
            {database},
        );

        expect(wrapper.toJSON()).toMatchSnapshot();
    });

    it('should match snapshot with shared filled in', () => {
        channel.delete_at = 0;
        channel.shared = true;

        const wrapper = renderWithEverything(
            <ChannelListRow
                id='1234'
                theme={Preferences.THEMES.denim}
                channel={channel}
                testID='ChannelListRow'
                enabled={true}
                selectable={false}
                selected={false}
                onPress={() => {
                    // noop
                }}
            >
                <br/>
            </ChannelListRow>,
            {database},
        );

        expect(wrapper.toJSON()).toMatchSnapshot();
    });

    it('should match snapshot with purpose filled in', () => {
        channel.purpose = 'My purpose';

        const wrapper = renderWithEverything(
            <ChannelListRow
                id='1234'
                theme={Preferences.THEMES.denim}
                channel={channel}
                testID='ChannelListRow'
                enabled={true}
                selectable={false}
                selected={false}
                onPress={() => {
                    // noop
                }}
            >
                <br/>
            </ChannelListRow>,
            {database},
        );

        expect(wrapper.toJSON()).toMatchSnapshot();
    });
});
