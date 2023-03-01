// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import CustomStatusEmoji from '@components/custom_status/custom_status_emoji';
import ProfilePicture from '@components/profile_picture';
import {BotTag, GuestTag} from '@components/tag';
import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme, changeOpacity} from '@utils/theme';
import {typography} from '@utils/typography';
import {displayUsername, getUserCustomStatus, isBot, isCustomStatusExpired, isGuest, isShared} from '@utils/user';

import type UserModel from '@typings/database/models/servers/user';

type AtMentionItemProps = {
    user: UserProfile | UserModel;
    currentUserId: string;
    testID?: string;
    isCustomStatusEnabled: boolean;
    showBadges?: boolean;
    locale?: string;
    teammateNameDisplay: string;
    rightDecorator?: React.ReactNode;
    onUserPress?: (user: UserProfile | UserModel) => void;
    onUserLongPress?: (user: UserProfile | UserModel) => void;
    disabled?: boolean;
}

const getThemedStyles = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        rowFullname: {
            ...typography('Body', 200),
            color: theme.centerChannelColor,
            flex: 0,
            flexShrink: 1,
        },
        rowUsername: {
            ...typography('Body', 100),
            color: changeOpacity(theme.centerChannelColor, 0.64),
        },
    };
});

const nonThemedStyles = StyleSheet.create({
    row: {
        height: 40,
        paddingVertical: 8,
        paddingTop: 4,
        flexDirection: 'row',
        alignItems: 'center',
    },
    icon: {
        marginLeft: 4,
    },
    profile: {
        marginRight: 12,
    },
    tag: {
        marginLeft: 6,
    },
    flex: {
        flex: 1,
    },
});

const UserItem = ({
    user,
    currentUserId,
    testID,
    isCustomStatusEnabled,
    showBadges = false,
    locale,
    teammateNameDisplay,
    rightDecorator,
    onUserPress,
    onUserLongPress,
    disabled = false,
}: AtMentionItemProps) => {
    const theme = useTheme();
    const style = getThemedStyles(theme);
    const intl = useIntl();

    const bot = user ? isBot(user) : false;
    const guest = user ? isGuest(user.roles) : false;
    const shared = user ? isShared(user) : false;

    const isCurrentUser = currentUserId === user?.id;
    const customStatus = getUserCustomStatus(user);
    const customStatusExpired = isCustomStatusExpired(user);

    const deleteAt = 'deleteAt' in user ? user.deleteAt : user.delete_at;

    let displayName = displayUsername(user, locale, teammateNameDisplay);
    const showTeammateDisplay = displayName !== user?.username;
    if (isCurrentUser) {
        displayName = intl.formatMessage({id: 'channel_header.directchannel.you', defaultMessage: '{displayName} (you)'}, {displayName});
    }

    const userItemTestId = `${testID}.${user?.id}`;

    const containerStyle = useMemo(() => {
        return [
            nonThemedStyles.row,
            {
                opacity: disabled ? 0.32 : 1,
            },
        ];
    }, [disabled]);

    const onPress = useCallback(() => {
        onUserPress?.(user);
    }, [user, onUserPress]);

    const onLongPress = useCallback(() => {
        onUserLongPress?.(user);
    }, [user, onUserLongPress]);

    return (
        <TouchableOpacity
            onPress={onPress}
            onLongPress={onLongPress}
            disabled={!(onUserPress || onUserLongPress)}
        >
            <View
                style={containerStyle}
                testID={userItemTestId}
            >
                <ProfilePicture
                    author={user}
                    size={24}
                    showStatus={false}
                    testID={`${userItemTestId}.profile_picture`}
                    containerStyle={nonThemedStyles.profile}
                />

                <Text
                    style={style.rowFullname}
                    numberOfLines={1}
                    testID={`${userItemTestId}.display_name`}
                >
                    {displayName}
                    {Boolean(showTeammateDisplay) && (
                        <Text
                            style={style.rowUsername}
                            testID={`${userItemTestId}.username`}
                        >
                            {` @${user!.username}`}
                        </Text>
                    )}
                    {Boolean(deleteAt) && (
                        <Text
                            style={style.rowUsername}
                            testID={`${userItemTestId}.deactivated`}
                        >
                            {` ${intl.formatMessage({id: 'mobile.user_list.deactivated', defaultMessage: 'Deactivated'})}`}
                        </Text>
                    )}
                </Text>
                {showBadges && bot && (
                    <BotTag
                        testID={`${userItemTestId}.bot.tag`}
                        style={nonThemedStyles.tag}
                    />
                )}
                {showBadges && guest && (
                    <GuestTag
                        testID={`${userItemTestId}.guest.tag`}
                        style={nonThemedStyles.tag}
                    />
                )}
                {Boolean(isCustomStatusEnabled && !bot && customStatus?.emoji && !customStatusExpired) && (
                    <CustomStatusEmoji
                        customStatus={customStatus!}
                        style={nonThemedStyles.icon}
                    />
                )}
                {shared && (
                    <CompassIcon
                        name={'circle-multiple-outline'}
                        size={16}
                        color={theme.centerChannelColor}
                        style={nonThemedStyles.icon}
                    />
                )}
                <View style={nonThemedStyles.flex}/>
                {Boolean(rightDecorator) && rightDecorator}
            </View>
        </TouchableOpacity>
    );
};

export default UserItem;
