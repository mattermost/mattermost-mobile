// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';
import {
    Text,
    View,
} from 'react-native';

import ProfilePicture from '@components/profile_picture';
import {BotTag, GuestTag} from '@components/tag';
import {makeStyleSheetFromTheme, changeOpacity} from '@utils/theme';
import {displayUsername, isGuest} from '@utils/user';

import CustomListRow, {Props as CustomListRowProps} from '../custom_list_row';

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            flex: 1,
            flexDirection: 'row',
            paddingHorizontal: 15,
            overflow: 'hidden',
        },
        profileContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            color: theme.centerChannelColor,
        },
        textContainer: {
            marginLeft: 10,
            justifyContent: 'center',
            flexDirection: 'column',
            flex: 1,
        },
        displayName: {
            fontSize: 15,
            color: changeOpacity(theme.centerChannelColor, 0.5),
        },
        username: {
            fontSize: 15,
            color: theme.centerChannelColor,
        },
        indicatorContainer: {
            flexDirection: 'row',
        },
        deactivated: {
            marginTop: 2,
            fontSize: 12,
            color: changeOpacity(theme.centerChannelColor, 0.5),
        },
        sharedUserIcon: {
            alignSelf: 'center',
            opacity: 0.75,
        },
    };
});

export type UserListRowProps = {
    id: string;
    isMyUser: boolean;
    theme: object;
    user: UserProfile;
    teammateNameDisplay: string;
    testID: string;
    onPress: (item: UserProfile) => void;
};

type Props = UserListRowProps & CustomListRowProps;

const UserListRow = ({
    isMyUser, theme, user, teammateNameDisplay, testID, onPress, enabled, selectable, selected,
}: Props) => {
    const intl = useIntl();
    const style = getStyleFromTheme(theme);
    const {username} = user;
    const userID = user.id;

    const onPressRow = (): void => {
        onPress(user);
    };

    let usernameDisplay = `@${username}`;
    if (isMyUser) {
        usernameDisplay = intl.formatMessage({
            id: 'mobile.more_dms.you',
            defaultMessage: '@{username} - you',
        }, {username});
    }

    const teammateDisplay = displayUsername(user, intl.locale, teammateNameDisplay);
    const showTeammateDisplay = teammateDisplay !== username;
    const itemTestID = `${testID}.${userID}`;
    const displayUsernameTestID = `${testID}.display_username`;
    const profilePictureTestID = `${itemTestID}.profile_picture`;

    return (
        <View style={style.container}>
            <CustomListRow
                id={userID}
                onPress={onPressRow}
                enabled={enabled}
                selectable={selectable}
                selected={selected}
                testID={testID}
            >
                <View style={style.profileContainer}>
                    <ProfilePicture
                        author={user}
                        size={32}
                        iconSize={24}
                        testID={profilePictureTestID}
                    />
                </View>
                <View
                    style={style.textContainer}
                    testID={itemTestID}
                >
                    <View>
                        <View style={style.indicatorContainer}>
                            <Text
                                style={style.username}
                                ellipsizeMode='tail'
                                numberOfLines={1}
                                testID={displayUsernameTestID}
                            >
                                {usernameDisplay}
                            </Text>
                            <BotTag
                                show={Boolean(user.is_bot)}
                            />
                            <GuestTag
                                show={isGuest(user.roles)}
                            />
                        </View>
                    </View>
                    {showTeammateDisplay &&
                        <View>
                            <Text
                                style={style.displayName}
                                ellipsizeMode='tail'
                                numberOfLines={1}
                            >
                                {teammateDisplay}
                            </Text>
                        </View>
                    }
                </View>
            </CustomListRow>
        </View>
    );
};

export default UserListRow;
