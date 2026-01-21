// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';

import FormattedRelativeTime from '@components/formatted_relative_time';
import UserItem from '@components/user_item';
import {useTheme} from '@context/theme';
import {dismissBottomSheet} from '@screens/navigation';
import {openUserProfile} from '@utils/navigation';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import type UserModel from '@typings/database/models/servers/user';
import type {AvailableScreens} from '@typings/screens/navigation';

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
    time: {
        color: changeOpacity(theme.centerChannelColor, 0.64),
        ...typography('Body', 75),
    },
}));

type Props = {
    channelId: string;
    location: AvailableScreens;
    user: UserModel;
    userAcknowledgement: number;
    timezone?: UserTimezone;
}

const UserListItem = ({
    channelId,
    location,
    timezone,
    user,
    userAcknowledgement,
}: Props) => {
    const theme = useTheme();
    const style = getStyleSheet(theme);

    const handleUserPress = useCallback(async (userProfile: UserProfile) => {
        if (userProfile) {
            await dismissBottomSheet();
            await openUserProfile({
                userId: userProfile.id,
                channelId,
                location,
            });
        }
    }, [channelId, location]);

    return (
        <UserItem
            FooterComponent={
                <FormattedRelativeTime
                    value={userAcknowledgement}
                    timezone={timezone}
                    style={style.time}
                />
            }
            containerStyle={style.container}
            onUserPress={handleUserPress}
            size={40}
            user={user}
        />
    );
};

export default UserListItem;
