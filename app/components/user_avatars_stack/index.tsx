// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {StyleProp, Text, TouchableOpacity, View, ViewStyle} from 'react-native';

import FormattedText from '@components/formatted_text';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {bottomSheet} from '@screens/navigation';
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import UserAvatar from './user_avatar';
import UsersList from './users_list';

import type UserModel from '@typings/database/models/servers/user';

const OVERFLOW_DISPLAY_LIMIT = 99;

type Props = {
    channelId: string;
    location: string;
    users: UserModel[];
    breakAt?: number;
    style?: StyleProp<ViewStyle>;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    const size = 24;
    const imgOverlap = -6;

    return {
        container: {
            flexDirection: 'row',
        },
        firstAvatar: {
            justifyContent: 'center',
            alignItems: 'center',
            width: size,
            height: size,
            borderWidth: (size / 2) + 1,
            borderColor: theme.centerChannelBg,
            backgroundColor: theme.centerChannelBg,
            borderRadius: size / 2,
        },
        notFirstAvatars: {
            justifyContent: 'center',
            alignItems: 'center',
            width: size,
            height: size,
            borderWidth: (size / 2) + 1,
            borderColor: theme.centerChannelBg,
            backgroundColor: theme.centerChannelBg,
            borderRadius: size / 2,
            marginLeft: imgOverlap,
        },
        overflowContainer: {
            justifyContent: 'center',
            alignItems: 'center',
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: 1,
            borderColor: theme.centerChannelBg,
            backgroundColor: theme.centerChannelBg,
            marginLeft: imgOverlap,
        },
        overflowItem: {
            justifyContent: 'center',
            alignItems: 'center',
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: 1,
            borderColor: theme.centerChannelBg,
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
            color: changeOpacity(theme.centerChannelColor, 0.56),
            ...typography('Body', 75, 'SemiBold'),
            textTransform: 'uppercase',
        },
    };
});

const UserAvatarsStack = ({breakAt = 3, channelId, location, style: baseContainerStyle, users}: Props) => {
    const theme = useTheme();
    const intl = useIntl();
    const isTablet = useIsTablet();

    const showParticipantsList = useCallback(preventDoubleTap(() => {
        const renderContent = () => (
            <>
                {!isTablet && (
                    <View style={style.listHeader}>
                        <FormattedText
                            id='mobile.participants.header'
                            defaultMessage={'Thread Participants'}
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
        bottomSheet({
            closeButtonId: 'close-set-user-status',
            renderContent,
            initialSnapIndex: 1,
            snapPoints: ['90%', '50%', 10],
            title: intl.formatMessage({id: 'mobile.participants.header', defaultMessage: 'Thread Participants'}),
            theme,
        });
    }), [isTablet, theme, users, channelId, location]);

    const displayUsers = users.slice(0, breakAt);
    const overflowUsersCount = Math.min(users.length - displayUsers.length, OVERFLOW_DISPLAY_LIMIT);

    const style = getStyleSheet(theme);

    return (
        <TouchableOpacity
            onPress={showParticipantsList}
            style={baseContainerStyle}
        >
            <View style={style.container}>
                {displayUsers.map((user, index) => (
                    <UserAvatar
                        key={user.id}
                        style={index === 0 ? style.firstAvatar : style.notFirstAvatars}
                        user={user}
                    />
                ))}
                {Boolean(overflowUsersCount) && (
                    <View style={style.overflowContainer}>
                        <View style={style.overflowItem}>
                            <Text style={style.overflowText} >
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
