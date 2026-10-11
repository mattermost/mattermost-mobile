// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {type ComponentProps} from 'react';
import {View} from 'react-native';

import FavoriteBox from '@components/channel_actions/favorite_box';
import MutedBox from '@components/channel_actions/mute_box';
import SetHeaderBox from '@components/channel_actions/set_header_box';
import {General} from '@constants';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import ChannelActions from './channel_actions';

jest.mock('@components/channel_actions/favorite_box', () => ({__esModule: true, default: jest.fn()}));
jest.mock('@components/channel_actions/mute_box', () => ({__esModule: true, default: jest.fn()}));
jest.mock('@components/channel_actions/set_header_box', () => ({__esModule: true, default: jest.fn()}));
jest.mock('@components/channel_actions/add_members_box', () => ({__esModule: true, default: jest.fn()}));
jest.mock('@components/channel_actions/copy_channel_link_box', () => ({__esModule: true, default: jest.fn()}));
jest.mock('@calls/components/channel_info_start_call', () => ({__esModule: true, default: jest.fn()}));

describe('ChannelActions', () => {
    const getBaseProps = (): ComponentProps<typeof ChannelActions> => ({
        channelId: 'dmchannelid',
        channelType: General.DM_CHANNEL,
        dismissChannelInfo: jest.fn(),
        callsEnabled: false,
        canManageMembers: false,
        canSetHeader: true,
        testID: 'channel_actions',
    });

    beforeEach(() => {
        jest.mocked(FavoriteBox).mockImplementation(() => React.createElement(View, {testID: 'favorite'}));
        jest.mocked(MutedBox).mockImplementation(() => React.createElement(View, {testID: 'muted'}));
        jest.mocked(SetHeaderBox).mockImplementation((props: {testID?: string}) => React.createElement(View, {testID: props.testID}));
    });

    it('should offer to set the header of a conversation', () => {
        const {getByTestId} = renderWithIntlAndTheme(<ChannelActions {...getBaseProps()}/>);

        expect(getByTestId('channel_actions.set_header.action')).toBeTruthy();
    });

    it('should not offer to set the header while the DM/GM write decision denies', () => {
        const props = getBaseProps();
        props.canSetHeader = false;
        const {queryByTestId} = renderWithIntlAndTheme(<ChannelActions {...props}/>);

        expect(queryByTestId('channel_actions.set_header.action')).toBeNull();
    });
});
