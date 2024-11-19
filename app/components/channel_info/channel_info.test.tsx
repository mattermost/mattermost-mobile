// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {render} from '@testing-library/react-native';
import React from 'react';

import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import FormattedTime from '@components/formatted_time';
import {General} from '@constants';
import {useTheme} from '@context/theme';
import {getUserTimezone} from '@utils/user';

import Avatar from './avatar';
import ChannelInfo from './channel_info';

import type ChannelModel from '@typings/database/models/servers/channel';
import type UserModel from '@typings/database/models/servers/user';

jest.mock('@context/theme', () => ({
    useTheme: jest.fn(),
}));

jest.mock('@components/formatted_text', () => jest.fn(() => null));
jest.mock('@components/formatted_time', () => jest.fn(() => null));
jest.mock('./avatar', () => jest.fn(() => null));
jest.mock('@components/compass_icon', () => jest.fn(() => null));
jest.mock('@utils/user', () => ({
    getUserTimezone: jest.fn(),
}));

describe('ChannelInfo Component', () => {
    const mockTheme = {
        centerChannelColor: '#000000',
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (useTheme as jest.Mock).mockReturnValue(mockTheme);
        (getUserTimezone as jest.Mock).mockReturnValue('UTC');
    });

    it('renders correctly for a DM channel', () => {
        const baseProps = {
            channel: {type: General.DM_CHANNEL, displayName: 'Direct Message Channel'} as ChannelModel,
            draftReceiverUser: undefined,
            updateAt: 1633024800000,
            rootId: undefined,
            testID: 'channel-info',
            currentUser: {timezone: 'UTC'} as unknown as UserModel,
            isMilitaryTime: true,
        };

        render(<ChannelInfo {...baseProps}/>);
        expect(CompassIcon).toHaveBeenCalledWith(
            expect.objectContaining({
                name: 'globe',
            }),
            expect.anything(),
        );
        expect(FormattedTime).toHaveBeenCalledWith(
            expect.objectContaining({
                timezone: 'UTC',
                isMilitaryTime: true,
                value: 1633024800000,
            }),
            expect.anything(),
        );
    });

    it('renders correctly for a public channel', () => {
        const baseProps = {
            channel: {type: General.OPEN_CHANNEL, displayName: 'Public Channel', createAt: 0, creatorId: '', deleteAt: 0, updateAt: 0} as ChannelModel,
            draftReceiverUser: undefined,
            updateAt: 1633024800000,
            rootId: undefined,
            testID: 'channel-info',
            currentUser: {timezone: 'UTC'} as unknown as UserModel,
            isMilitaryTime: true,
        };
        render(<ChannelInfo {...baseProps}/>);
        expect(FormattedText).toHaveBeenCalledWith(
            expect.objectContaining({
                id: 'channel_info.draft_in_channel',
                defaultMessage: 'In:',
            }),
            expect.anything(),
        );
        expect(CompassIcon).toHaveBeenCalledWith(
            expect.objectContaining({
                name: 'globe',
            }),
            expect.anything(),
        );
    });

    it('renders correctly for a thread', () => {
        const baseProps = {
            channel: {type: General.DM_CHANNEL, displayName: 'Direct Message Channel'} as ChannelModel,
            draftReceiverUser: undefined,
            updateAt: 1633024800000,
            rootId: 'root-post-id',
            testID: 'channel-info',
            currentUser: {timezone: 'UTC'} as unknown as UserModel,
            isMilitaryTime: true,
        };
        const {getByTestId} = render(<ChannelInfo {...baseProps}/>);

        expect(useTheme).toHaveBeenCalled();
        expect(getByTestId('channel-info')).toBeTruthy();
        expect(FormattedText).toHaveBeenCalledWith(
            expect.objectContaining({
                id: 'channel_info.thread_in',
                defaultMessage: 'Thread in:',
            }),
            expect.anything(),
        );
    });

    it('renders the Avatar when draftReceiverUser is provided', () => {
        const baseProps = {
            channel: {type: General.DM_CHANNEL, displayName: 'Direct Message Channel'} as ChannelModel,
            draftReceiverUser: {id: 'user-id', username: 'JohnDoe'} as UserModel,
            updateAt: 1633024800000,
            rootId: undefined,
            testID: 'channel-info',
            currentUser: {timezone: 'UTC'} as unknown as UserModel,
            isMilitaryTime: true,
        };
        render(<ChannelInfo {...baseProps}/>);

        expect(Avatar).toHaveBeenCalledWith(
            expect.objectContaining({
                author: baseProps.draftReceiverUser,
            }),
            expect.anything(),
        );
    });

    it('renders CompassIcon when draftReceiverUser is not provided', () => {
        const baseProps = {
            channel: {type: General.DM_CHANNEL, displayName: 'Direct Message Channel'} as ChannelModel,
            draftReceiverUser: undefined,
            updateAt: 1633024800000,
            rootId: undefined,
            testID: 'channel-info',
            currentUser: {timezone: 'UTC'} as unknown as UserModel,
            isMilitaryTime: true,
        };
        render(<ChannelInfo {...baseProps}/>);

        expect(CompassIcon).toHaveBeenCalledWith(
            expect.objectContaining({
                name: 'globe',
            }),
            expect.anything(),
        );
    });
});
