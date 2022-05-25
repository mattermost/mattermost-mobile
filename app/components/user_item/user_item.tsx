// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {IntlShape, useIntl} from 'react-intl';
import {StyleProp, Text, View, ViewStyle} from 'react-native';

import {typography} from '@app/utils/typography';
import ChannelIcon from '@components/channel_icon';
import CustomStatusEmoji from '@components/custom_status/custom_status_emoji';
import FormattedText from '@components/formatted_text';
import ProfilePicture from '@components/profile_picture';
import {BotTag, GuestTag} from '@components/tag';
import {General} from '@constants';
import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme, changeOpacity} from '@utils/theme';
import {getUserCustomStatus, isBot, isGuest, isShared} from '@utils/user';

import type UserModel from '@typings/database/models/servers/user';

type AtMentionItemProps = {
    user?: UserProfile | UserModel;
    containerStyle?: StyleProp<ViewStyle>;
    currentUserId: string;
    showFullName: boolean;
    testID?: string;
    isCustomStatusEnabled: boolean;
}

const getName = (user: UserProfile | UserModel | undefined, showFullName: boolean, isCurrentUser: boolean, intl: IntlShape) => {
    let name = '';
    if (!user) {
        return intl.formatMessage({id: 'channel_loader.someone', defaultMessage: 'Someone'});
    }

    const hasNickname = user.nickname.length > 0;

    if (showFullName) {
        const first = 'first_name' in user ? user.first_name : user.firstName;
        const last = 'last_name' in user ? user.last_name : user.lastName;
        name += `${first} ${last} `;
    }

    if (hasNickname && !isCurrentUser) {
        name += name.length > 0 ? `(${user.nickname})` : user.nickname;
    }

    return name.trim();
};

const getStyleFromTheme = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        row: {
            height: 40,
            paddingVertical: 8,
            paddingTop: 4,
            paddingHorizontal: 16,
            flexDirection: 'row',
            alignItems: 'center',
        },
        rowPicture: {
            marginRight: 10,
            marginLeft: 2,
            width: 24,
            alignItems: 'center',
            justifyContent: 'center',
        },
        rowInfo: {
            flexDirection: 'row',
            overflow: 'hidden',
        },
        rowFullname: {
            ...typography('Body', 200),
            color: theme.centerChannelColor,
            paddingLeft: 4,
            flexShrink: 1,
        },
        rowUsername: {
            ...typography('Body', 200),
            color: changeOpacity(theme.centerChannelColor, 0.64),
            fontSize: 15,
            fontFamily: 'OpenSans',
            flexShrink: 5,
        },
        icon: {
            marginLeft: 4,
        },
    };
});

const UserItem = ({
    containerStyle,
    user,
    currentUserId,
    showFullName,
    testID,
    isCustomStatusEnabled,
}: AtMentionItemProps) => {
    const theme = useTheme();
    const style = getStyleFromTheme(theme);
    const intl = useIntl();

    const bot = user ? isBot(user) : false;
    const guest = user ? isGuest(user.roles) : false;
    const shared = user ? isShared(user) : false;

    const isCurrentUser = currentUserId === user?.id;
    const name = getName(user, showFullName, isCurrentUser, intl);
    const customStatus = getUserCustomStatus(user);

    return (
        <View style={[style.row, containerStyle]}>
            <View style={style.rowPicture}>
                <ProfilePicture
                    author={user}
                    size={24}
                    showStatus={false}
                    testID={`${testID}.profile_picture`}
                />
            </View>
            <View
                style={[style.rowInfo, {maxWidth: shared ? '75%' : '80%'}]}
            >
                {bot && <BotTag/>}
                {guest && <GuestTag/>}
                {Boolean(name.length) &&
                    <Text
                        style={style.rowFullname}
                        numberOfLines={1}
                        testID={`${testID}.name`}
                    >
                        {name}
                    </Text>
                }
                {isCurrentUser &&
                    <FormattedText
                        id='suggestion.mention.you'
                        defaultMessage=' (you)'
                        style={style.rowUsername}
                    />
                }
                {Boolean(user) &&
                <Text
                    style={style.rowUsername}
                    numberOfLines={1}
                    testID='at_mention_item.username'
                >
                    {` @${user!.username}`}
                </Text>
                }
            </View>
            {isCustomStatusEnabled && !bot && customStatus && (
                <CustomStatusEmoji
                    customStatus={customStatus}
                    style={style.icon}
                />
            )}
            {shared && (
                <ChannelIcon
                    name={name}
                    isActive={false}
                    isArchived={false}
                    isInfo={true}
                    isUnread={false}
                    size={18}
                    shared={true}
                    type={General.DM_CHANNEL}
                    style={style.icon}
                />
            )}
        </View>
    );
};

export default UserItem;
