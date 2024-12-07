// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {type ReactNode} from 'react';
import {Text, View} from 'react-native';

import FormattedText from '@components/formatted_text';
import FormattedTime from '@components/formatted_time';
import {General} from '@constants';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';
import {getUserTimezone} from '@utils/user';

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
            alignItems: 'center',
        },
        channelInfo: {
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
        },
        category: {
            color: changeOpacity(theme.centerChannelColor, 0.64),
            ...typography('Body', 75, 'SemiBold'),
            marginRight: 8,
        },
        categoryIconContainer: {
            width: 24,
            height: 24,
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
            padding: 4,
            borderRadius: 555,
        },
        profileComponentContainer: {
            marginRight: 6,
        },
        displayName: {
            color: changeOpacity(theme.centerChannelColor, 0.64),
            ...typography('Body', 75, 'SemiBold'),
        },
        time: {
            color: changeOpacity(theme.centerChannelColor, 0.64),
            ...typography('Body', 75),
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
        <View style={style.categoryIconContainer}>
            <CompassIcon
                color={changeOpacity(theme.centerChannelColor, 0.64)}
                name='globe'
                size={16}
            />
        </View>);

    if (rootId) {
        headerComponent = (
            <View style={style.channelInfo}>
                <FormattedText
                    id='channel_info.thread_in'
                    defaultMessage={'Thread in:'}
                    style={style.category}
                />
                <View style={style.profileComponentContainer}>
                    {profileComponent}
                </View>
            </View>
        );
    } else if (isChannelTypeDM) {
        headerComponent = (
            <View style={style.channelInfo}>
                <FormattedText
                    id='channel_info.draft_to_user'
                    defaultMessage={'To:'}
                    style={style.category}
                />
                <View style={style.profileComponentContainer}>
                    {profileComponent}
                </View>
            </View>
        );
    } else {
        headerComponent = (
            <View style={style.channelInfo}>
                <FormattedText
                    id='channel_info.draft_in_channel'
                    defaultMessage={'In:'}
                    style={style.category}
                />
                <View style={style.profileComponentContainer}>
                    {profileComponent}
                </View>
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
