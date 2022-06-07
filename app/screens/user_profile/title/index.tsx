// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';
import {useIntl} from 'react-intl';
import {Text, View} from 'react-native';

import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';
import {displayUsername} from '@utils/user';

import UserProfileAvatar from './avatar';
import UserProfileTag from './tag';

import type UserModel from '@typings/database/models/servers/user';

type Props = {
    enablePostIconOverride: boolean;
    enablePostUsernameOverride: boolean;
    isChannelAdmin: boolean;
    isSystemAdmin: boolean;
    isTeamAdmin: boolean;
    teammateDisplayName: string;
    user: UserModel;
    userIconOverride?: string;
    usernameOverride?: string;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        flexDirection: 'row',
        marginBottom: 20,
    },
    details: {
        marginLeft: 24,
        justifyContent: 'center',
        flex: 1,
    },
    displayName: {
        color: theme.centerChannelColor,
        ...typography('Heading', 600, 'SemiBold'),
    },
    username: {
        color: changeOpacity(theme.centerChannelColor, 0.64),
        ...typography('Body', 200),
    },
    tablet: {
        marginTop: 20,
    },
}));

const UserProfileTitle = ({
    enablePostIconOverride, enablePostUsernameOverride,
    isChannelAdmin, isSystemAdmin, isTeamAdmin,
    teammateDisplayName, user, userIconOverride, usernameOverride,
}: Props) => {
    const intl = useIntl();
    const isTablet = useIsTablet();
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const override = enablePostUsernameOverride && usernameOverride;

    let displayName;
    if (override) {
        displayName = usernameOverride;
    } else {
        displayName = displayUsername(user, intl.locale, teammateDisplayName, false);
    }

    const hideUsername = override || (displayName && displayName === user.username);
    const prefix = hideUsername ? '@' : '';

    return (
        <View style={[styles.container, isTablet && styles.tablet]}>
            <UserProfileAvatar
                enablePostIconOverride={enablePostIconOverride}
                user={user}
                userIconOverride={userIconOverride}
            />
            <View style={styles.details}>
                <UserProfileTag
                    isBot={user.isBot || Boolean(userIconOverride || usernameOverride)}
                    isChannelAdmin={isChannelAdmin}
                    isGuest={user.isGuest}
                    isSystemAdmin={isSystemAdmin}
                    isTeamAdmin={isTeamAdmin}
                />
                <Text
                    numberOfLines={1}
                    style={styles.displayName}
                >
                    {`${prefix}${displayName}`}
                </Text>
                {!hideUsername &&
                <Text
                    numberOfLines={1}
                    style={styles.username}
                >
                    {`@${user.username}`}
                </Text>
                }
            </View>
        </View>
    );
};

export default UserProfileTitle;
