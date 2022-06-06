// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {Keyboard, Text, TouchableOpacity, useWindowDimensions, View} from 'react-native';

import FormattedText from '@components/formatted_text';
import {Screens} from '@constants';
import {openAsBottomSheet} from '@screens/navigation';
import {preventDoubleTap} from '@utils/tap';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type HeaderDisplayNameProps = {
    channelId: string;
    commentCount: number;
    displayName?: string;
    location: string;
    rootPostAuthor?: string;
    shouldRenderReplyButton?: boolean;
    theme: Theme;
    userIconOverride?: string;
    userId: string;
    usernameOverride?: string;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        displayName: {
            color: theme.centerChannelColor,
            flexGrow: 1,
            ...typography('Body', 200, 'SemiBold'),
        },
        displayNameContainer: {
            maxWidth: '60%',
            marginRight: 5,
        },
        displayNameContainerBotReplyWidth: {
            maxWidth: '50%',
        },
        displayNameContainerLandscape: {
            maxWidth: '80%',
        },
        displayNameContainerLandscapeBotReplyWidth: {
            maxWidth: '70%',
        },

    };
});

const HeaderDisplayName = ({
    channelId, commentCount, displayName,
    location, rootPostAuthor,
    shouldRenderReplyButton, theme,
    userIconOverride, userId, usernameOverride,
}: HeaderDisplayNameProps) => {
    const dimensions = useWindowDimensions();
    const intl = useIntl();
    const style = getStyleSheet(theme);

    const onPress = useCallback(preventDoubleTap(() => {
        const screen = Screens.USER_PROFILE;
        const title = intl.formatMessage({id: 'mobile.routes.user_profile', defaultMessage: 'Profile'});
        const closeButtonId = 'close-user-profile';
        const props = {closeButtonId, userId, channelId, location, userIconOverride, usernameOverride};

        Keyboard.dismiss();
        openAsBottomSheet({screen, title, theme, closeButtonId, props});
    }), [intl.locale, channelId, userIconOverride, userId, usernameOverride, theme]);

    const calcNameWidth = () => {
        const isLandscape = dimensions.width > dimensions.height;

        const showReply = shouldRenderReplyButton || (!rootPostAuthor && commentCount > 0);

        if (showReply && isLandscape) {
            return style.displayNameContainerLandscapeBotReplyWidth;
        } else if (isLandscape) {
            return style.displayNameContainerLandscape;
        } else if (showReply) {
            return style.displayNameContainerBotReplyWidth;
        }
        return undefined;
    };

    const displayNameWidth = calcNameWidth();
    const displayNameStyle = [style.displayNameContainer, displayNameWidth];

    if (displayName) {
        return (
            <View style={displayNameStyle}>
                <TouchableOpacity onPress={onPress}>
                    <Text
                        style={style.displayName}
                        ellipsizeMode={'tail'}
                        numberOfLines={1}
                        testID='post_header.display_name'
                    >
                        {displayName}
                    </Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={style.displayNameContainer}>
            <FormattedText
                id='channel_loader.someone'
                defaultMessage='Someone'
                style={style.displayName}
                testID='post_header.display_name'
            />
        </View>
    );
};

export default HeaderDisplayName;
