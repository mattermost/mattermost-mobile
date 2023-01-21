// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Text} from 'react-native';

import {Preferences} from '@constants';
import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import CustomList from '.';

import type Database from '@nozbe/watermelondb/Database';

describe('components/integration_selector/custom_list', () => {
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
            <CustomList
                data={[channel]}
                key='custom_list'
                loading={false}
                theme={Preferences.THEMES.denim}
                testID='ChannelListRow'
                noResults={() => {
                    return <Text>{'No Results'}</Text>;
                }}
                onLoadMore={() => {
                    // noop
                }}
                onRowPress={() => {
                    // noop
                }}
                renderItem={(props: object): JSX.Element => {
                    return (<Text>{props.toString()}</Text>);
                }}
                loadingComponent={null}
            />,
            {database},
        );

        expect(wrapper.toJSON()).toBeTruthy();
    });
});
