// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {Keyboard, StyleProp, TextStyle, TouchableOpacity, View} from 'react-native';

import {Screens} from '@app/constants';
import {openAsBottomSheet} from '@app/screens/navigation';
import Emoji from '@components/emoji';
import {preventDoubleTap} from '@utils/tap';

interface ComponentProps {
    channelId: string;
    location: string;
    theme: Theme;
    userIconOverride?: string;
    userId: string;
    usernameOverride?: string;
    customStatus: UserCustomStatus;
    emojiSize?: number;
    style?: StyleProp<TextStyle>;
    testID?: string;
}

const CustomStatusEmoji = ({
    channelId,
    location,
    theme,
    userIconOverride,
    userId,
    usernameOverride,
    customStatus,
    emojiSize = 16,
    style,
    testID,
}: ComponentProps) => {
    const intl = useIntl();

    const onPress = useCallback(preventDoubleTap(() => {
        const screen = Screens.USER_PROFILE;
        const title = intl.formatMessage({id: 'mobile.routes.user_profile', defaultMessage: 'Profile'});
        const closeButtonId = 'close-user-profile';
        const props = {closeButtonId, userId, channelId, location, userIconOverride, usernameOverride};

        Keyboard.dismiss();
        openAsBottomSheet({screen, title, theme, closeButtonId, props});
    }), [intl.locale, channelId, userIconOverride, userId, usernameOverride, theme]);

    if (customStatus.emoji) {
        return (
            <View
                style={style}
                testID={`${testID}.custom_status.custom_status_emoji.${customStatus.emoji}`}
            >
                <TouchableOpacity onPress={onPress}>
                    <Emoji
                        size={emojiSize}
                        emojiName={customStatus.emoji}
                    />
                </TouchableOpacity>
            </View>
        );
    }

    return null;
};

export default CustomStatusEmoji;
