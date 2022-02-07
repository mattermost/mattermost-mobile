// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database, Q} from '@nozbe/watermelondb';
import React from 'react';

import {MM_TABLES} from '@app/constants/database';
import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import ChannelListItem from './channel_list_item';

import type ChannelModel from '@typings/database/models/servers/channel';
import type MyChannelModel from '@typings/database/models/servers/my_channel';

describe('components/channel_list/categories/body/channel/item', () => {
    let database: Database;
    let channel: ChannelModel;
    let myChannel: MyChannelModel;

    beforeAll(async () => {
        const server = await TestHelper.setupServerDatabase();
        database = server.database;

        const channels = await database.get<ChannelModel>(MM_TABLES.SERVER.CHANNEL).query(
            Q.take(1),
        ).fetch();
        channel = channels[0];
        myChannel = await database.get<MyChannelModel>(MM_TABLES.SERVER.MY_CHANNEL).find(channel.id);
    });

    it('should match snapshot', () => {
        const wrapper = renderWithEverything(
            <ChannelListItem
                channel={channel}
                myChannel={myChannel}
            />,
        );

        expect(wrapper.toJSON()).toMatchSnapshot();
    });
});
