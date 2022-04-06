// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database, Q} from '@nozbe/watermelondb';
import React from 'react';

import {MM_TABLES} from '@constants/database';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import ChannelListItem from './channel_list_item';

import type ChannelModel from '@typings/database/models/servers/channel';
import type MyChannelModel from '@typings/database/models/servers/my_channel';

describe('components/channel_list/categories/body/channel/item', () => {
    let database: Database;
    let myChannel: MyChannelModel;

    beforeAll(async () => {
        const server = await TestHelper.setupServerDatabase();
        database = server.database;

        const myChannels = await database.get<MyChannelModel>(MM_TABLES.SERVER.MY_CHANNEL).query(
            Q.take(1),
        ).fetch();

        myChannel = myChannels[0];
    });

    it('should match snapshot', () => {
        const wrapper = renderWithIntlAndTheme(
            <ChannelListItem
                channel={{displayName: 'Hello!', type: 'G', shared: false, name: 'hello', deleteAt: 0} as ChannelModel}
                isActive={false}
                myChannel={myChannel}
                isMuted={false}
                collapsed={false}
                currentUserId={'id'}
                testID='channel_list_item'
            />,
        );

        expect(wrapper.toJSON()).toMatchSnapshot();
    });
});
