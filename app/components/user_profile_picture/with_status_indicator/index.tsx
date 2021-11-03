// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect} from 'react';
import {StyleProp, View, ViewProps} from 'react-native';

import {fetchStatusInBatch} from '@actions/remote/user';
import UserStatus from '@components/user_status';
import {useServerUrl} from '@context/server_url';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import UserProfileImage from '../image';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            alignItems: 'flex-start',
        },
        icon: {
            color: changeOpacity(theme.centerChannelColor, 0.48),
        },
        statusWrapper: {
            position: 'absolute',
            right: 0,
            bottom: 0,
            overflow: 'hidden',
            backgroundColor: theme.centerChannelBg,
            borderWidth: 1,
            borderColor: theme.centerChannelBg,
        },
        status: {
            color: theme.centerChannelBg,
        },
    };
});

type UserProfilePictureWithStatusProps = {
    isBot?: boolean;
    lastPictureUpdate: number;
    showStatus?: boolean;
    statusSize?: number;
    statusStyle?: StyleProp<ViewProps>;
    testID?: string;
    userId?: string;
    userStatus: string;
};

const UserProfilePictureWithStatus = ({
    isBot,
    lastPictureUpdate,
    showStatus = true,
    statusSize = 14,
    statusStyle,
    testID,
    userId,
    userStatus,
}: UserProfilePictureWithStatusProps) => {
    const theme = useTheme();
    const serverUrl = useServerUrl();
    const style = getStyleSheet(theme);

    useEffect(() => {
        if (userId && !userStatus && showStatus) {
            fetchStatusInBatch(serverUrl, userId);
        }
    }, [userStatus, serverUrl, showStatus]);

    return (
        <View
            style={style.container}
            testID={`${testID}.${userId}`}
        >
            <View>
                <UserProfileImage
                    userId={userId}
                    size={120}
                    lastPictureUpdate={lastPictureUpdate}
                />
                { userStatus && !isBot && showStatus && (
                    <View
                        style={[
                            style.statusWrapper,
                            statusStyle,
                            {
                                borderRadius: statusSize / 2,
                                width: statusSize,
                                height: statusSize,
                            },
                        ]}
                    >
                        <UserStatus
                            size={statusSize}
                            status={userStatus}
                        />
                    </View>
                )}
            </View>
        </View>
    );
};

export default UserProfilePictureWithStatus;
