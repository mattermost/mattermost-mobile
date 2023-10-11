// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo, type ReactNode} from 'react';
import {useIntl} from 'react-intl';
import {StyleSheet, Text, TouchableOpacity, View, type StyleProp, type ViewStyle} from 'react-native';

import CompassIcon from '@components/compass_icon';
import CustomStatusEmoji from '@components/custom_status/custom_status_emoji';
import ProfilePicture from '@components/profile_picture';
import {BotTag, GuestTag} from '@components/tag';
import {useTheme} from '@context/theme';
import {nonBreakingString} from '@utils/strings';
import {makeStyleSheetFromTheme, changeOpacity} from '@utils/theme';
import {typography} from '@utils/typography';
import {displayUsername, getUserCustomStatus, isBot, isCustomStatusExpired, isDeactivated, isGuest, isShared} from '@utils/user';

import type UserModel from '@typings/database/models/servers/user';

type Props = {
    FooterComponent?: ReactNode;
    user?: UserProfile | UserModel;
    containerStyle?: StyleProp<ViewStyle>;
    currentUserId: string;
    includeMargin?: boolean;
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
            color: changeOpacity(theme.centerChannelColor, 0.64),
        },
    };
});

const nonThemedStyles = StyleSheet.create({
    row: {
        height: 40,
        paddingBottom: 8,
        paddingTop: 4,
        flexDirection: 'row',
        alignItems: 'center',
    },
    margin: {marginVertical: 8},
    rowInfoBaseContainer: {
        flex: 1,
    },
    rowInfoContainer: {
        flex: 1,
        flexDirection: 'row',
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
    FooterComponent,
    user,
    containerStyle,
    currentUserId,
    size = 24,
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
    padding,
    includeMargin,
    hideGuestTags,
}: Props) => {
    const theme = useTheme();
    const style = getThemedStyles(theme);
    const intl = useIntl();

    const bot = user ? isBot(user) : false;
    const guest = user ? isGuest(user.roles) : false;
    const shared = user ? isShared(user) : false;
    const deactivated = user ? isDeactivated(user) : false;

    const isCurrentUser = currentUserId === user?.id;
    const customStatus = getUserCustomStatus(user);
    const customStatusExpired = isCustomStatusExpired(user);

    let displayName = displayUsername(user, locale, teammateNameDisplay);
    const showTeammateDisplay = displayName !== user?.username;
    if (isCurrentUser) {
        displayName = intl.formatMessage({id: 'channel_header.directchannel.you', defaultMessage: '{displayName} (you)'}, {displayName});
    }

    const userItemTestId = `${testID}.${user?.id}`;

    const containerViewStyle = useMemo(() => {
        return [
            nonThemedStyles.row,
            {
                opacity: disabled ? 0.32 : 1,
                paddingHorizontal: padding || undefined,
            },
            includeMargin && nonThemedStyles.margin,
        ];
    }, [disabled, padding, includeMargin]);

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

    return (
        <TouchableOpacity
            onPress={onPress}
            onLongPress={onLongPress}
            disabled={!(onUserPress || onUserLongPress)}
            onLayout={onLayout}
        >
            <View
                ref={viewRef}
                style={[containerViewStyle, containerStyle]}
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
                            {Boolean(showTeammateDisplay) && Boolean(user?.username) && (
                                <Text
                                    style={style.rowUsername}
                                    testID={`${userItemTestId}.username`}
                                >
                                    {nonBreakingString(` @${user?.username}`)}
                                </Text>
                            )}
                            {deactivated && (
                                <Text
                                    style={style.rowUsername}
                                    testID={`${userItemTestId}.deactivated`}
                                >
                                    {nonBreakingString(` ${intl.formatMessage({id: 'mobile.user_list.deactivated', defaultMessage: 'Deactivated'})}`)}
                                </Text>
                            )}
                        </Text>
                        {showBadges && bot && (
                            <BotTag
                                testID={`${userItemTestId}.bot.tag`}
                                style={nonThemedStyles.tag}
                            />
                        )}
                        {showBadges && guest && !hideGuestTags && (
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
                    {FooterComponent}
                </View>
            </View>
        </TouchableOpacity>
    );
};

export default UserItem;
