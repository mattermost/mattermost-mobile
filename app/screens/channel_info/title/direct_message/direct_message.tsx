// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Text, View} from 'react-native';

import {BotTag, GuestTag} from '@app/components/tag';
import ProfilePicture from '@components/profile_picture';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import type UserModel from '@typings/database/models/servers/user';

type Props = {
    displayName?: string;
    user?: UserModel;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        alignItems: 'center',
        flexDirection: 'row',
    },
    displayName: {
        flexDirection: 'row',
    },
    position: {
        color: changeOpacity(theme.centerChannelColor, 0.72),
        ...typography('Body', 200),
    },
    tagContainer: {
        marginLeft: 12,
    },
    tag: {
        color: theme.centerChannelColor,
        ...typography('Body', 100, 'SemiBold'),
    },
    titleContainer: {
        flex: 1,
        marginLeft: 16,
    },
    title: {
        color: theme.centerChannelColor,
        ...typography('Heading', 700, 'SemiBold'),
        flexShrink: 1,
    },
}));

const DirectMessage = ({displayName, user}: Props) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    return (
        <View style={styles.container}>
            <ProfilePicture
                author={user}
                size={64}
                iconSize={64}
                showStatus={true}
                statusSize={24}
            />
            <View style={styles.titleContainer}>
                <View style={styles.displayName}>
                    <Text
                        numberOfLines={1}
                        style={styles.title}
                    >
                        {displayName}
                    </Text>
                    {user?.isGuest &&
                    <GuestTag
                        textStyle={styles.tag}
                        style={styles.tagContainer}
                    />
                    }
                    {user?.isBot &&
                    <BotTag
                        textStyle={styles.tag}
                        style={styles.tagContainer}
                    />
                    }
                </View>
                {Boolean(user?.position) &&
                <Text style={styles.position}>
                    {user?.position}
                </Text>
                }
                {Boolean(user?.isBot && user.props?.bot_description) &&
                <Text style={styles.position}>
                    {user?.props?.bot_description}
                </Text>
                }
            </View>
        </View>
    );
};

export default DirectMessage;
