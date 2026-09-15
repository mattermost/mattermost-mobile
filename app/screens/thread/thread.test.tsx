// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Text, View} from 'react-native';

import FloatingCallContainer from '@calls/components/floating_call_container';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import Thread from './thread';

import type PostModel from '@typings/database/models/servers/post';

jest.mock('@react-navigation/native', () => ({
    useIsFocused: () => true,
    useRoute: () => ({}),
}));

jest.mock('./thread_content', () => ({
    __esModule: true,
    default: () => null,
}));

jest.mock('@calls/components/floating_call_container', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mocked(FloatingCallContainer).mockImplementation(({channelId}) => (
    <View>
        <Text testID='floating_call_container.channel_id'>{`${channelId}`}</Text>
    </View>
));

describe('screens/thread/thread', () => {
    // isInACall is true whenever the screen is reached from the call screen,
    // which is what makes the FloatingCallContainer branch render.
    const baseProps = {
        isCRTEnabled: true,
        includeChannelBanner: false,
        showJoinCallBanner: false,
        isInACall: true,
        showIncomingCalls: false,
        rootId: 'thread-1',
        scheduledPostCount: 0,
    };

    it('should render the call container without a rootPost instead of crashing', () => {
        const {getByTestId} = renderWithIntlAndTheme(<Thread {...baseProps}/>);

        expect(getByTestId('floating_call_container.channel_id')).toHaveTextContent('undefined');
    });

    it('should pass the root post channel id to the call container when the post is local', () => {
        const rootPost = {channelId: 'channel-1'} as unknown as PostModel;
        const {getByTestId} = renderWithIntlAndTheme(
            <Thread
                {...baseProps}
                rootPost={rootPost}
            />,
        );

        expect(getByTestId('floating_call_container.channel_id')).toHaveTextContent('channel-1');
    });
});
