// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import CustomStatusEmoji from '@components/custom_status/custom_status_emoji';

import type {EmojiCommonStyle} from '@typings/components/emoji';
import type {StyleProp, TextStyle} from 'react-native';

type Props = {
    customStatus?: UserCustomStatus;
    customStatusExpired: boolean;
    isCustomStatusEnabled: boolean;
    style: StyleProp<Intersection<EmojiCommonStyle, TextStyle>>;
}

const CustomStatus = ({customStatus, customStatusExpired, isCustomStatusEnabled, style}: Props) => {
    const showCustomStatusEmoji = Boolean(isCustomStatusEnabled && customStatus?.emoji && !customStatusExpired);

    if (!showCustomStatusEmoji) {
        return null;
    }

    return (
        <CustomStatusEmoji
            customStatus={customStatus!}
            style={style}
        />
    );
};

export default CustomStatus;
