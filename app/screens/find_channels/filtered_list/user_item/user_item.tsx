// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {Text, TouchableOpacity, View} from 'react-native';

import CustomStatus from '@components/channel_item/custom_status';
import ProfilePicture from '@components/profile_picture';
import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';
import {displayUsername} from '@utils/user';

import type UserModel from '@typings/database/models/servers/user';

type Props = {
    currentUserId: string;
    onPress: (channelId: string, displayName: string) => void;
    teammateDisplayNameSetting?: string;
    testID?: string;
    user: UserModel;
}

export const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        flexDirection: 'row',
        paddingHorizontal: 0,
        height: 44,
        alignItems: 'center',
        marginVertical: 2,
    },
    wrapper: {
        flex: 1,
        flexDirection: 'row',
    },
    text: {
        marginTop: -1,
        color: theme.centerChannelColor,
        paddingLeft: 12,
        paddingRight: 20,
        ...typography('Body', 200, 'Regular'),
    },
    avatar: {marginLeft: 4},
    status: {
        backgroundColor: theme.centerChannelBg,
        borderWidth: 0,
    },
}));

const UserItem = ({currentUserId, onPress, teammateDisplayNameSetting, testID, user}: Props) => {
    const {formatMessage, locale} = useIntl();
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const isOwnDirectMessage = currentUserId === user.id;
    const displayName = displayUsername(user, locale, teammateDisplayNameSetting);
    const userItemTestId = `${testID}.${user.id}`;

    const handleOnPress = useCallback(() => {
        onPress(user.id, displayName);
    }, [user.id, displayName, onPress]);

    return (
        <TouchableOpacity onPress={handleOnPress}>
            <>
                <View
                    style={styles.container}
                    testID={userItemTestId}
                >
                    <View style={styles.wrapper}>
                        <View style={styles.avatar}>
                            <ProfilePicture
                                author={user}
                                size={24}
                                showStatus={true}
                                statusSize={12}
                                statusStyle={styles.status}
                                testID={`${userItemTestId}.profile_picture`}
                            />
                        </View>
                        <View>
                            <Text
                                ellipsizeMode='tail'
                                numberOfLines={1}
                                style={styles.text}
                                testID={`${userItemTestId}.display_name`}
                            >
                                {isOwnDirectMessage ? formatMessage({id: 'channel_header.directchannel.you', defaultMessage: '{displayName} (you)'}, {displayName}) : displayName}
                            </Text>
                        </View>
                        <CustomStatus userId={user.id}/>
                    </View>
                </View>
            </>
        </TouchableOpacity>
    );
};

export default UserItem;
