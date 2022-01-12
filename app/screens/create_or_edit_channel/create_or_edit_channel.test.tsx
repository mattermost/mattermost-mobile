// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {General} from '@app/constants';
import {renderWithIntl} from '@test/intl-test-helper';

import CreateOrEditChannel from './index';

import type ChannelModel from '@typings/database/models/servers/channel';
import type ChannelInfoModel from '@typings/database/models/servers/channel_info';

describe('CreateOrEditChannel', () => {
    const channel = {
        type: General.OPEN_CHANNEL,
        displayName: 'display name text',
    } as ChannelModel;

    const channelInfo = {
        header: 'header text',
        purpose: 'purpose text',
    } as ChannelInfoModel;

    const baseProps = {
        serverUrl: 'test server',
        componentId: 'componentId',
        channel: undefined,
        channelInfo: undefined,
    };

    test('no channel provided, create channel', () => {
        const {getByTestId} = renderWithIntl(
            <CreateOrEditChannel {...baseProps}/>,
        );
        expect(getByTestId('edit_channel_info.displayname.input').props.value).toEqual('');
        expect(getByTestId('edit_channel_info.purpose.input').props.value).toEqual('');
        expect(getByTestId('edit_channel_info.header.input').props.value).toEqual('');
    });

    test('channel provided, edit channel', () => {
        const {getByTestId} = renderWithIntl(
            <CreateOrEditChannel
                {...baseProps}
                channel={channel}
                channelInfo={channelInfo}
            />,
        );
        expect(getByTestId('edit_channel_info.displayname.input').props.value).toEqual(channel.displayName);
        expect(getByTestId('edit_channel_info.purpose.input').props.value).toEqual(channelInfo.purpose);
        expect(getByTestId('edit_channel_info.header.input').props.value).toEqual(channelInfo.header);
    });
});
