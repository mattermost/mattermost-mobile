// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {type ReactNode} from 'react';
import {Text, View} from 'react-native';

import {General} from '@app/constants';
import {useTheme} from '@app/context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@app/utils/theme';
import {typography} from '@app/utils/typography';
import {getUserTimezone} from '@app/utils/user';
import FormattedText from '@components/formatted_text';
import FormattedTime from '@components/formatted_time';

import CompassIcon from '../compass_icon';

import Avatar from './avatar';

import type ChannelModel from '@typings/database/models/servers/channel';
import type PostModel from '@typings/database/models/servers/post';
import type UserModel from '@typings/database/models/servers/user';

type Props = {
    channel: ChannelModel;
    draftReceiverUser?: UserModel;
    updateAt: number;
    rootId?: PostModel['rootId'];
    testID?: string;
    currentUser?: UserModel;
    isMilitaryTime: boolean;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
        },
        infoContainer: {
            display: 'flex',
            flexDirection: 'row',
            gap: 5,
            alignItems: 'center',
        },
        channelInfo: {
            display: 'flex',
            flexDirection: 'row',
            gap: 5,
            alignItems: 'center',
        },
        displayName: {
            fontSize: 12,
            fontWeight: '600',
            color: changeOpacity(theme.centerChannelColor, 0.64),
            lineHeight: 16,
            fontFamily: 'Open Sans',
        },
        timeInfo: {
            fontSize: 12,
            fontWeight: '400',
            color: changeOpacity(theme.centerChannelColor, 0.64),
            lineHeight: 16,
        },
        time: {
            color: theme.centerChannelColor,
            marginTop: 5,
            opacity: 0.5,
            ...typography('Body', 75, 'Regular'),
        },
    };
});

const ChannelInfo: React.FC<Props> = ({
    channel,
    draftReceiverUser,
    updateAt,
    rootId,
    testID,
    currentUser,
    isMilitaryTime,
}) => {
    const theme = useTheme();
    const style = getStyleSheet(theme);
    const isChannelTypeDM = channel.type === General.DM_CHANNEL;

    let headerComponent: ReactNode = null;
    const profileComponent = draftReceiverUser ? <Avatar author={draftReceiverUser}/> : (
        <CompassIcon
            color={changeOpacity(theme.centerChannelColor, 0.64)}
            name='globe'
            size={18}
        />);

    if (rootId) {
        headerComponent = (
            <View style={style.channelInfo}>
                <FormattedText
                    id='channel_info.thread_in'
                    defaultMessage={'Thread in:'}
                    style={style.displayName}
                />
                {profileComponent}
            </View>
        );
    } else if (isChannelTypeDM) {
        headerComponent = (
            <View style={style.channelInfo}>
                <FormattedText
                    id='channel_info.to'
                    defaultMessage={'To:'}
                    style={style.displayName}
                />
                {profileComponent}
            </View>
        );
    } else {
        headerComponent = (
            <View style={style.channelInfo}>
                <FormattedText
                    id='channel_info.in'
                    defaultMessage={'In:'}
                    style={style.displayName}
                />
                {profileComponent}
            </View>
        );
    }

    return (

        <View
            style={style.container}
            testID={testID}
        >
            <View style={style.infoContainer}>
                {headerComponent}
                <Text style={style.displayName}>
                    {channel.displayName}
                </Text>
            </View>
            <FormattedTime
                timezone={getUserTimezone(currentUser)}
                isMilitaryTime={isMilitaryTime}
                value={updateAt}
                style={style.time}
                testID='post_header.date_time'
            />
        </View>
    );
};

export default ChannelInfo;
