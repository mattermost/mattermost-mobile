// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {Keyboard, TouchableOpacity} from 'react-native';

import CustomStatusEmoji from '@app/components/custom_status/custom_status_emoji';
import {Screens} from '@app/constants';
import {openAsBottomSheet} from '@app/screens/navigation';
import {makeStyleSheetFromTheme} from '@app/utils/theme';
import {preventDoubleTap} from '@utils/tap';

type HeaderCustomStatusEmojiProps = {
    channelId: string;
    location: string;
    theme: Theme;
    userIconOverride?: string;
    usernameOverride?: string;
    userId: string;
    customStatus: UserCustomStatus;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        customStatusEmoji: {
            color: theme.centerChannelColor,
            marginRight: 4,
            marginTop: 2,
        },
    };
});

const HeaderCustomStatusEmoji = ({
    channelId,
    customStatus,
    location,
    theme,
    userIconOverride,
    usernameOverride,
    userId,
}: HeaderCustomStatusEmojiProps) => {
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

    return (
        <TouchableOpacity onPress={onPress}>
            <CustomStatusEmoji
                customStatus={customStatus!}
                style={style.customStatusEmoji}
                testID='post_header'
            />
        </TouchableOpacity>
    );
};

export default HeaderCustomStatusEmoji;
