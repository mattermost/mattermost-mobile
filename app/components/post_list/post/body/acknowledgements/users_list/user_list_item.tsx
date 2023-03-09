// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';
import {Keyboard, TouchableOpacity, View} from 'react-native';

import FormattedRelativeTime from '@components/formatted_relative_time';
import UserItem from '@components/user_item';
import {Screens} from '@constants';
import {useTheme} from '@context/theme';
import {dismissBottomSheet, openAsBottomSheet} from '@screens/navigation';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import type UserModel from '@typings/database/models/servers/user';

export const USER_ROW_HEIGHT = 60;

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        paddingLeft: 0,
        height: USER_ROW_HEIGHT,
    },
    pictureContainer: {
        alignItems: 'flex-start',
        width: 40,
    },
    ackContainer: {
        paddingLeft: 4,
    },
    time: {
        color: changeOpacity(theme.centerChannelColor, 0.64),
        ...typography('Body', 75),
    },
}));

type Props = {
    channelId: string;
    location: string;
    user: UserModel;
    userAcknowledgement: number;
    timezone?: UserTimezone;
}

const UserListItem = ({channelId, location, user, userAcknowledgement, timezone}: Props) => {
    const intl = useIntl();
    const theme = useTheme();
    const style = getStyleSheet(theme);
    const openUserProfile = async () => {
        if (user) {
            await dismissBottomSheet(Screens.BOTTOM_SHEET);
            const screen = Screens.USER_PROFILE;
            const title = intl.formatMessage({id: 'mobile.routes.user_profile', defaultMessage: 'Profile'});
            const closeButtonId = 'close-user-profile';
            const props = {closeButtonId, location, userId: user.id, channelId};

            Keyboard.dismiss();
            openAsBottomSheet({screen, title, theme, closeButtonId, props});
        }
    };

    return (
        <TouchableOpacity onPress={openUserProfile}>
            <UserItem
                FooterComponent={
                    <View style={style.ackContainer}>
                        <FormattedRelativeTime
                            value={userAcknowledgement}
                            timezone={timezone}
                            style={style.time}
                        />
                    </View>
                }
                containerStyle={style.container}
                pictureContainerStyle={style.pictureContainer}
                size={40}
                user={user}
            />
        </TouchableOpacity>
    );
};

export default UserListItem;
