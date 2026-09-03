// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database, Q} from '@nozbe/watermelondb';
import React from 'react';
import {StyleSheet} from 'react-native';

import {Preferences} from '@constants';
import {MM_TABLES} from '@constants/database';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import ChannelItem from './channel_item';

import type ChannelModel from '@typings/database/models/servers/channel';
import type MyChannelModel from '@typings/database/models/servers/my_channel';

describe('components/channel_list/categories/body/channel_item', () => {
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
            <ChannelItem
                channel={{displayName: 'Hello!', type: 'O', shared: false, name: 'hello', deleteAt: 0} as ChannelModel}
                hasDraft={false}
                isActive={false}
                membersCount={0}
                isMuted={false}
                currentUserId={'id'}
                testID='channel_item'
                onPress={() => undefined}
                isUnread={myChannel.isUnread}
                mentionsCount={myChannel.mentionsCount}
                hasCall={false}
            />,
        );

        expect(wrapper.toJSON()).toMatchSnapshot();
    });

    it('should match snapshot when it has a draft', () => {
        const wrapper = renderWithIntlAndTheme(
            <ChannelItem
                channel={{displayName: 'Hello!', type: 'G', shared: false, name: 'hello', deleteAt: 0} as ChannelModel}
                hasDraft={true}
                isActive={false}
                membersCount={3}
                isMuted={false}
                currentUserId={'id'}
                testID='channel_item'
                onPress={() => undefined}
                isUnread={myChannel.isUnread}
                mentionsCount={myChannel.mentionsCount}
                hasCall={false}
            />,
        );

        expect(wrapper.toJSON()).toMatchSnapshot();
    });

    it('should match snapshot when it has a call', () => {
        const wrapper = renderWithIntlAndTheme(
            <ChannelItem
                channel={{displayName: 'Hello!', type: 'G', shared: false, name: 'hello', deleteAt: 0} as ChannelModel}
                hasDraft={true}
                isActive={false}
                membersCount={3}
                isMuted={false}
                currentUserId={'id'}
                testID='channel_item'
                onPress={() => undefined}
                isUnread={myChannel.isUnread}
                mentionsCount={myChannel.mentionsCount}
                hasCall={true}
            />,
        );

        expect(wrapper.toJSON()).toMatchSnapshot();
    });

    it('should use the urgent badge colors for urgent mentions', () => {
        const {getByTestId} = renderWithIntlAndTheme(
            <ChannelItem
                channel={{displayName: 'Hello!', type: 'O', shared: false, name: 'hello', deleteAt: 0} as ChannelModel}
                hasDraft={false}
                isActive={false}
                membersCount={0}
                isMuted={false}
                currentUserId='id'
                testID='channel_item'
                onPress={() => undefined}
                isUnread={true}
                mentionsCount={2}
                urgentMentionCount={1}
                hasCall={false}
            />,
        );

        const badgeStyle = StyleSheet.flatten(getByTestId('channel_item.hello.badge').props.style);
        expect(badgeStyle.backgroundColor).toBe(Preferences.THEMES.denim.dndIndicator);
        expect(badgeStyle.color).toBe('#ffffff');
    });
});
