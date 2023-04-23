// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {Platform, type StyleProp, View, type ViewStyle} from 'react-native';

import UserStatus from '@components/user_status';
import {makeStyleSheetFromTheme} from '@utils/theme';

import type UserModel from '@typings/database/models/servers/user';

type Props = {
    author?: UserModel | UserProfile;
    statusSize: number;
    statusStyle?: StyleProp<ViewStyle>;
    theme: Theme;
}

const STATUS_BUFFER = Platform.select({
    ios: 3,
    default: 2,
});

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        statusWrapper: {
            position: 'absolute',
            bottom: -STATUS_BUFFER,
            right: -STATUS_BUFFER,
            overflow: 'hidden',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.centerChannelBg,
            borderWidth: 1,
            borderColor: theme.centerChannelBg,
        },
    };
});

const Status = ({author, statusSize, statusStyle, theme}: Props) => {
    const styles = getStyleSheet(theme);
    const containerStyle = useMemo(() => ([
        styles.statusWrapper,
        statusStyle,
        {borderRadius: statusSize / 2},
    ]), [statusStyle, styles]);
    const isBot = author && (('isBot' in author) ? author.isBot : author.is_bot);
    if (author?.status && !isBot) {
        return (
            <View
                style={containerStyle}
            >
                <UserStatus
                    size={statusSize}
                    status={author.status}
                />
            </View>
        );
    }
    return null;
};

export default Status;
