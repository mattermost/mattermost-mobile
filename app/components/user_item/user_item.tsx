// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, type ReactNode} from 'react';
import {useIntl} from 'react-intl';
import {StyleSheet, Text, TouchableOpacity, View, type StyleProp, type ViewStyle} from 'react-native';

import CompassIcon from '@components/compass_icon';
import CustomStatusEmoji from '@components/custom_status/custom_status_emoji';
import ProfilePicture from '@components/profile_picture';
import {BotTag, GuestTag} from '@components/tag';
import {nonBreakingString} from '@utils/strings';
import {makeStyleSheetFromTheme, changeOpacity, useStyling} from '@utils/theme';
import {typography} from '@utils/typography';
import {displayUsername, getUserCustomStatus, isBot, isCustomStatusExpired, isDeactivated, isGuest, isShared} from '@utils/user';

import type UserModel from '@typings/database/models/servers/user';

type Props = {
    footer?: ReactNode;
    user?: UserProfile | UserModel;
    containerStyle?: StyleProp<ViewStyle>;
    currentUserId: string;
    size?: number;
    testID?: string;
    isCustomStatusEnabled: boolean;
    showBadges?: boolean;
    locale?: string;
    teammateNameDisplay: string;
    rightDecorator?: React.ReactNode;
    onUserPress?: (user: UserProfile | UserModel) => void;
    onUserLongPress?: (user: UserProfile | UserModel) => void;
    onLayout?: () => void;
    disabled?: boolean;
    viewRef?: React.LegacyRef<View>;
    padding?: number;
    spacing?: 'compact' | 'normal' | 'spacious';
    hideGuestTags: boolean;
}

const getThemedStyles = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        rowPicture: {
            marginRight: 10,
            marginLeft: 2,
            width: 24,
            alignItems: 'center',
            justifyContent: 'center',
        },
        rowFullname: {
            ...typography('Body', 200),
            color: theme.centerChannelColor,
            flex: 0,
            flexShrink: 1,
        },
        rowUsername: {
            ...typography('Body', 100),
            flex: 1,
            flexShrink: 0,
            color: changeOpacity(theme.centerChannelColor, 0.64),
        },
    };
});

const nonThemedStyles = StyleSheet.create({
    rowInfoBaseContainer: {
        flex: 1,
        paddingVertical: 4,
    },
    rowInfoContainer: {
        flex: 0,
        flexShrink: 1,
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
    rightContainer: {
        marginLeft: 'auto',
    },
});

const UserItem = ({
    footer,
    user,
    containerStyle,
    currentUserId,
    spacing = 'normal',
    size = ({compact: 24, normal: 32, spacious: 40})[spacing],
    testID,
    isCustomStatusEnabled,
    showBadges = false,
    locale,
    teammateNameDisplay,
    rightDecorator,
    onLayout,
    onUserPress,
    onUserLongPress,
    disabled = false,
    viewRef,
    padding = 20,
    hideGuestTags,
}: Props) => {
    const {style, theme} = useStyling((t) => ({
        ...getThemedStyles(t),
        row: {
            height: ({compact: 32, normal: 48, spacious: 56})[spacing],
            paddingHorizontal: padding,
            flexDirection: 'row',
            alignItems: 'center',
            opacity: disabled ? 0.32 : 1,
        },
    }), [disabled, padding, spacing]);
    const intl = useIntl();

    const onPress = useCallback(() => {
        if (user) {
            onUserPress?.(user);
        }
    }, [user, onUserPress]);

    const onLongPress = useCallback(() => {
        if (user) {
            onUserLongPress?.(user);
        }
    }, [user, onUserLongPress]);

    const userIsBot = user ? isBot(user) : false;
    const userIsGuest = user ? isGuest(user.roles) : false;
    const userIsShared = user ? isShared(user) : false;
    const userIsDeactivated = user ? isDeactivated(user) : false;

    const isCurrentUser = currentUserId === user?.id;
    const customStatus = getUserCustomStatus(user);
    const customStatusExpired = isCustomStatusExpired(user);

    let displayName = displayUsername(user, locale, teammateNameDisplay);
    const showTeammateDisplay = displayName !== user?.username;
    if (isCurrentUser) {
        displayName = intl.formatMessage({id: 'channel_header.directchannel.you', defaultMessage: '{displayName} (you)'}, {displayName});
    }

    const userItemTestId = `${testID}.${user?.id}`;

    const username = showTeammateDisplay && Boolean(user?.username) && (
        <Text
            style={style.rowUsername}
            testID={`${userItemTestId}.username`}
        >
            {nonBreakingString(` @${user?.username}`)}
        </Text>
    );
    const deactivated = userIsDeactivated && (
        <Text
            style={style.rowUsername}
            testID={`${userItemTestId}.deactivated`}
        >
            {nonBreakingString(` ${intl.formatMessage({id: 'mobile.user_list.deactivated', defaultMessage: 'Deactivated'})}`)}
        </Text>
    );
    const botBadge = userIsBot && (
        <BotTag
            testID={`${userItemTestId}.bot.tag`}
            style={nonThemedStyles.tag}
        />
    );
    const guestBadge = userIsGuest && !hideGuestTags && (
        <GuestTag
            testID={`${userItemTestId}.guest.tag`}
            style={nonThemedStyles.tag}
        />
    );
    const customStatusEmoji = Boolean(isCustomStatusEnabled && !userIsBot && customStatus?.emoji && !customStatusExpired) && (
        <CustomStatusEmoji
            customStatus={customStatus!}
            style={nonThemedStyles.icon}
        />
    );
    const sharedBadge = userIsShared && (
        <CompassIcon
            name={'circle-multiple-outline'}
            size={16}
            color={theme.centerChannelColor}
            style={nonThemedStyles.icon}
        />
    );

    const details: ReactNode = [username, deactivated];
    const badges: ReactNode = [botBadge, guestBadge, customStatusEmoji, sharedBadge];

    return (
        <TouchableOpacity
            onPress={onPress}
            onLongPress={onLongPress}
            disabled={!(onUserPress || onUserLongPress)}
            onLayout={onLayout}
        >
            <View
                ref={viewRef}
                style={[style.row, containerStyle]}
                testID={userItemTestId}
            >
                <ProfilePicture
                    author={user}
                    size={size}
                    showStatus={false}
                    testID={`${userItemTestId}.profile_picture`}
                    containerStyle={nonThemedStyles.profile}
                />
                <View style={nonThemedStyles.rowInfoBaseContainer}>
                    <View style={nonThemedStyles.rowInfoContainer}>
                        <Text
                            style={style.rowFullname}
                            numberOfLines={1}
                            testID={`${userItemTestId}.display_name`}
                        >
                            {nonBreakingString(displayName)}
                            {!footer && spacing !== 'spacious' && details}
                        </Text>
                        {showBadges && badges}
                    </View>
                    {footer ?? (spacing === 'spacious' && details)}
                </View>
                {Boolean(rightDecorator) && <View style={nonThemedStyles.rightContainer}>{rightDecorator}</View>}
            </View>
        </TouchableOpacity>
    );
};

export default UserItem;
