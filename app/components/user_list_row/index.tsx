// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {
    Text,
    View,
} from 'react-native';

import CompassIcon from '@components/compass_icon';
import ProfilePicture from '@components/profile_picture';
import {BotTag, GuestTag} from '@components/tag';
import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme, changeOpacity} from '@utils/theme';
import {displayUsername, isGuest} from '@utils/user';

import TouchableWithFeedback from '../touchable_with_feedback';

type Props = {
    id: string;
    isMyUser: boolean;
    user: UserProfile;
    teammateNameDisplay: string;
    testID: string;
    onPress?: (user: UserProfile) => void;
    selectable: boolean;
    selected: boolean;
    enabled: boolean;
}

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
        selector: {
            height: 28,
            width: 28,
            borderRadius: 14,
            borderWidth: 3,
            borderColor: changeOpacity(theme.centerChannelColor, 0.32),
            alignItems: 'center',
            justifyContent: 'center',
        },
        selectorContainer: {
            height: 50,
            paddingRight: 10,
            alignItems: 'center',
            justifyContent: 'center',
        },
        selectorDisabled: {
            borderColor: changeOpacity(theme.centerChannelColor, 0.16),
        },
        selectorFilled: {
            backgroundColor: theme.sidebarBg,
            borderWidth: 0,
        },
    };
});

export default function UserListRow({
    id,
    isMyUser,
    user,
    teammateNameDisplay,
    testID,
    onPress,
    selectable,
    selected,
    enabled,
}: Props) {
    const theme = useTheme();
    const style = getStyleFromTheme(theme);
    const intl = useIntl();
    const {formatMessage} = intl;

    const {username} = user;

    const handlePress = useCallback(() => {
        if (onPress) {
            onPress(user);
        }
    }, [onPress, user]);

    const iconStyle = useMemo(() => {
        return [style.selector, (selected && style.selectorFilled), (!enabled && style.selectorDisabled)];
    }, [style, selected, enabled]);

    const Icon = () => {
        return (
            <View style={style.selectorContainer}>
                <View style={iconStyle}>
                    {selected &&
                        <CompassIcon
                            name='check'
                            size={24}
                            color={theme.sidebarText}
                        />
                    }
                </View>
            </View>
        );
    };

    let usernameDisplay = `@${username}`;
    if (isMyUser) {
        usernameDisplay = formatMessage({
            id: 'mobile.create_direct_message.you',
            defaultMessage: '@{username} - you',
        }, {username});
    }

    const teammateDisplay = displayUsername(user, intl.locale, teammateNameDisplay);
    const showTeammateDisplay = teammateDisplay !== username;

    const itemTestID = `${testID}.${id}`;
    const displayNameTestID = `${itemTestID}.display_name`;
    const profilePictureTestID = `${itemTestID}.profile_picture`;

    return (
        <TouchableWithFeedback
            onPress={handlePress}
        >
            <View
                style={style.container}
                testID={itemTestID}
            >
                <View style={style.profileContainer}>
                    <ProfilePicture
                        author={user}
                        size={32}
                        iconSize={24}
                        testID={profilePictureTestID}
                    />
                </View>
                <View style={style.textContainer}>
                    <View>
                        <View style={style.indicatorContainer}>
                            <Text
                                style={style.username}
                                ellipsizeMode='tail'
                                numberOfLines={1}
                                testID={displayNameTestID}
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
                    {user.delete_at > 0 &&
                    <View>
                        <Text
                            style={style.deactivated}
                        >
                            {formatMessage({id: 'mobile.user_list.deactivated', defaultMessage: 'Deactivated'})}
                        </Text>
                    </View>
                    }
                </View>
                {selectable &&
                <Icon/>
                }
            </View>
        </TouchableWithFeedback>
    );
}

