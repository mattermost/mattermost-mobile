// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl, type MessageDescriptor} from 'react-intl';
import {Platform, type StyleProp, Text, type TextStyle, TouchableOpacity, View, type ViewStyle} from 'react-native';

import FormattedText from '@components/formatted_text';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {usePreventDoubleTap} from '@hooks/utils';
import {BOTTOM_SHEET_ANDROID_OFFSET} from '@screens/bottom_sheet';
import {TITLE_HEIGHT} from '@screens/bottom_sheet/content';
import {bottomSheet} from '@screens/navigation';
import {bottomSheetSnapPoint} from '@utils/helpers';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import UserAvatar from './user_avatar';
import UsersList from './users_list';

import type UserModel from '@typings/database/models/servers/user';
import type {AvailableScreens} from '@typings/screens/navigation';

const OVERFLOW_DISPLAY_LIMIT = 99;
const USER_ROW_HEIGHT = 40;

type Props = {
    channelId?: string;
    location: AvailableScreens;
    users: UserModel[];
    breakAt?: number;
    style?: StyleProp<ViewStyle>;
    noBorder?: boolean;
    avatarStyle?: StyleProp<ViewStyle>;
    overflowContainerStyle?: StyleProp<ViewStyle>;
    overflowItemStyle?: StyleProp<ViewStyle>;
    overflowTextStyle?: StyleProp<TextStyle>;
    bottomSheetTitle: MessageDescriptor;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    const size = 24;
    const imgOverlap = -6;

    return {
        container: {
            flexDirection: 'row',
        },
        avatarCommon: {
            justifyContent: 'center',
            alignItems: 'center',
            width: size,
            height: size,
            borderWidth: (size / 2) + 1,
            borderColor: theme.centerChannelBg,
            backgroundColor: theme.centerChannelBg,
            borderRadius: size / 2,
        },
        noBorder: {
            borderWidth: 0,
        },
        notFirstAvatars: {
            marginLeft: imgOverlap,
        },
        overflowContainer: {
            borderRadius: size / 2,
            borderWidth: 1,
            marginLeft: imgOverlap,
        },
        overflowItem: {
            borderRadius: size / 2,
            borderWidth: 1,
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
        },
        overflowText: {
            fontSize: 10,
            fontWeight: 'bold',
            color: changeOpacity(theme.centerChannelColor, 0.64),
            textAlign: 'center',
        },
        listHeader: {
            marginBottom: 12,
        },
        listHeaderText: {
            color: theme.centerChannelColor,
            ...typography('Heading', 600, 'SemiBold'),
        },
    };
});

const UserAvatarsStack = ({
    breakAt = 3,
    channelId,
    location,
    style: baseContainerStyle,
    users,
    noBorder = false,
    avatarStyle,
    overflowContainerStyle,
    overflowItemStyle,
    overflowTextStyle,
    bottomSheetTitle,
}: Props) => {
    const theme = useTheme();
    const style = getStyleSheet(theme);
    const intl = useIntl();
    const isTablet = useIsTablet();

    const showParticipantsList = usePreventDoubleTap(useCallback(() => {
        const renderContent = () => (
            <>
                {!isTablet && (
                    <View style={style.listHeader}>
                        <FormattedText
                            {...bottomSheetTitle}
                            style={style.listHeaderText}
                        />
                    </View>
                )}
                <UsersList
                    channelId={channelId}
                    location={location}
                    users={users}
                />
            </>
        );

        let height = bottomSheetSnapPoint(Math.min(users.length, 5), USER_ROW_HEIGHT) + TITLE_HEIGHT;
        if (Platform.OS === 'android') {
            height += BOTTOM_SHEET_ANDROID_OFFSET;
        }

        const snapPoints: Array<string | number> = [1, height];
        if (users.length > 5) {
            snapPoints.push('80%');
        }

        bottomSheet({
            closeButtonId: 'close-set-user-status',
            renderContent,
            initialSnapIndex: 1,
            snapPoints,
            title: intl.formatMessage(bottomSheetTitle),
            theme,
        });
    }, [users, intl, bottomSheetTitle, theme, isTablet, style.listHeader, style.listHeaderText, channelId, location]));

    const displayUsers = users.slice(0, breakAt);
    const overflowUsersCount = Math.min(users.length - displayUsers.length, OVERFLOW_DISPLAY_LIMIT);

    return (
        <TouchableOpacity
            onPress={showParticipantsList}
            style={baseContainerStyle}
        >
            <View style={style.container}>
                {displayUsers.map((user, index) => (
                    <UserAvatar
                        key={user.id}
                        style={index === 0 ? [style.avatarCommon, noBorder && style.noBorder, avatarStyle] : [style.avatarCommon, style.notFirstAvatars, noBorder && style.noBorder, avatarStyle]}
                        user={user}
                    />
                ))}
                {Boolean(overflowUsersCount) && (
                    <View style={[style.avatarCommon, style.overflowContainer, noBorder && style.noBorder, overflowContainerStyle]}>
                        <View style={[style.avatarCommon, style.overflowItem, noBorder && style.noBorder, overflowItemStyle]}>
                            <Text style={[style.overflowText, overflowTextStyle]}>
                                {'+' + overflowUsersCount.toString()}
                            </Text>
                        </View>
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );
};

export default UserAvatarsStack;
