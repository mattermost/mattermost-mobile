// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';
import {useIntl} from 'react-intl';
import {Text, TouchableOpacity, View} from 'react-native';
import Animated from 'react-native-reanimated';

import {buildAbsoluteUrl} from '@actions/remote/file';
import {buildProfileImageUrlFromUser} from '@actions/remote/user';
import {GalleryInit} from '@context/gallery';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {useGalleryItem} from '@hooks/gallery';
import {openGalleryAtIndex} from '@utils/gallery';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';
import {displayUsername} from '@utils/user';

import UserProfileAvatar from './avatar';
import UserProfileTag from './tag';

import type UserModel from '@typings/database/models/servers/user';
import type {GalleryItemType} from '@typings/screens/gallery';

type Props = {
    enablePostIconOverride: boolean;
    enablePostUsernameOverride: boolean;
    headerText?: string;
    imageSize?: number;
    isChannelAdmin: boolean;
    isSystemAdmin: boolean;
    isTeamAdmin: boolean;
    teammateDisplayName: string;
    user: UserModel;
    userIconOverride?: string;
    usernameOverride?: string;
    hideGuestTags: boolean;
}

export const HEADER_TEXT_HEIGHT = 30;

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
    heading: {
        height: HEADER_TEXT_HEIGHT,
        color: theme.centerChannelColor,
        marginBottom: 20,
        ...typography('Heading', 600, 'SemiBold'),
    },
    tablet: {
        marginTop: 20,
    },
}));

const UserProfileTitle = ({
    enablePostIconOverride, enablePostUsernameOverride, headerText,
    imageSize, isChannelAdmin, isSystemAdmin, isTeamAdmin,
    teammateDisplayName, user, userIconOverride, usernameOverride, hideGuestTags,
}: Props) => {
    const galleryIdentifier = `${user.id}-avatarPreview`;
    const intl = useIntl();
    const isTablet = useIsTablet();
    const theme = useTheme();
    const serverUrl = useServerUrl();
    const styles = getStyleSheet(theme);
    const override = enablePostUsernameOverride && usernameOverride;

    let displayName: string;
    if (override) {
        displayName = usernameOverride;
    } else {
        displayName = displayUsername(user, intl.locale, teammateDisplayName, false);
    }

    const onPress = () => {
        let imageUrl: string|undefined;
        if (enablePostIconOverride && userIconOverride) {
            imageUrl = userIconOverride;
        } else {
            const pictureUrl = buildProfileImageUrlFromUser(serverUrl, user);
            imageUrl = buildAbsoluteUrl(serverUrl, pictureUrl);
        }

        if (imageUrl) {
            const item: GalleryItemType = {
                id: user.id,
                uri: imageUrl,
                width: 400,
                height: 400,
                lastPictureUpdate: user.lastPictureUpdate,
                name: displayName,
                mime_type: 'image/png',
                authorId: user.id,
                type: 'avatar',
            };
            openGalleryAtIndex(galleryIdentifier, 0, [item]);
        }
    };

    const {ref, onGestureEvent, styles: galleryStyles} = useGalleryItem(
        galleryIdentifier,
        0,
        onPress,
    );

    const hideUsername = override || (displayName && displayName === user.username);
    const prefix = hideUsername ? '@' : '';

    return (
        <>
            {headerText &&
                <Text
                    style={styles.heading}
                    testID='user_profile.heading'
                >
                    {headerText}
                </Text>
            }
            <View style={[styles.container, isTablet && styles.tablet]}>
                <GalleryInit galleryIdentifier={galleryIdentifier}>
                    <Animated.View style={galleryStyles}>
                        <TouchableOpacity onPress={onGestureEvent}>
                            <UserProfileAvatar
                                forwardRef={ref}
                                enablePostIconOverride={enablePostIconOverride}
                                imageSize={imageSize || undefined}
                                user={user}
                                userIconOverride={userIconOverride}
                            />
                        </TouchableOpacity>
                    </Animated.View>
                </GalleryInit>
                <View style={styles.details}>
                    <UserProfileTag
                        isBot={user.isBot || Boolean(userIconOverride || usernameOverride)}
                        isChannelAdmin={isChannelAdmin}
                        showGuestTag={user.isGuest && !hideGuestTags}
                        isSystemAdmin={isSystemAdmin}
                        isTeamAdmin={isTeamAdmin}
                    />
                    <Text
                        numberOfLines={1}
                        style={styles.displayName}
                        testID='user_profile.display_name'
                    >
                        {`${prefix}${displayName}`}
                    </Text>
                    {!hideUsername &&
                    <Text
                        numberOfLines={1}
                        style={styles.username}
                        testID='user_profile.username'
                    >
                        {`@${user.username}`}
                    </Text>
                    }
                </View>
            </View>
        </>
    );
};

export default UserProfileTitle;
