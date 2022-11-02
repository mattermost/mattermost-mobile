// Copyright (c) 2022-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import { useIntl } from 'react-intl';
import {
    Text,
    View,
    StyleProp,
    ViewStyle,
} from 'react-native';

import ChannelIcon from '@components/channel_icon';
import ProfilePicture from '@components/profile_picture';
import { BotTag, GuestTag } from '@components/tag';
import { makeStyleSheetFromTheme, changeOpacity } from '@utils/theme';

import CustomListRow, { Props as CustomListRowProps } from './custom_list_row';
import type UserModel from '@typings/database/models/servers/user';

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

type UserListRowProps = {
    id: string,
    isMyUser: boolean,
    theme: object,
    user: UserModel,
    teammateNameDisplay: string,
    testID: string,
};

type Props = UserListRowProps & CustomListRowProps;

const UserListRow = ({
    id, isMyUser, theme, user, teammateNameDisplay, testID, onPress, item,
    enabled, selectable, selected,
}: Props) => {
    const onPressRow = () => {
        if (onPress) {
            onPress(id, item);
        }
    };

    const renderIcon = (style: StyleProp<ViewStyle>) => {
        // if (!isShared(user)) {  // TODO IsShared came from redux
        //     return null;
        // }
        return (
            <ChannelIcon
                name=""  // TODO
                isActive={false}
                isArchived={false}
                // isBot={false}
                isUnread={true}
                isInfo={true}
                size={18}
                shared={true}
            // style={style.sharedUserIcon}
            // theme={theme}
            // type={General.DM_CHANNEL}  // TODO This came from redux
            />
        );
    };


    const intl = useIntl();
    const { username } = user;
    const userID = user.id;
    const style = getStyleFromTheme(theme);

    let usernameDisplay = `@${username}`;
    if (isMyUser) {
        usernameDisplay = intl.formatMessage({
            id: 'mobile.more_dms.you',
            defaultMessage: '@{username} - you',
        }, { username });
    }

    // const teammateDisplay = displayUsername(user, teammateNameDisplay);  // TODO This came from Redux
    const teammateDisplay = "";
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
                        // userId={userID}
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
                                show={Boolean(user.isBot)}
                            // theme={theme}
                            />
                            <GuestTag
                                show={user.isGuest}
                            // theme={theme}
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
                    {user.deleteAt > 0 &&
                        <View>
                            <Text
                                style={style.deactivated}
                            >
                                {intl.formatMessage({ id: 'mobile.user_list.deactivated', defaultMessage: 'Deactivated' })}
                            </Text>
                        </View>
                    }
                </View>
                {renderIcon(style)}
            </CustomListRow>
        </View>
    );
}

export default UserListRow;
