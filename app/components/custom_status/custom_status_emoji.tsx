// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';
import {Text, TextStyle} from 'react-native';
import {useSelector} from 'react-redux';

import Emoji from '@components/emoji';
import {GlobalState} from '@mm-redux/types/store';
import {makeGetCustomStatus} from '@selectors/custom_status';

interface ComponentProps {
    emojiSize?: number;
    userID?: string;
    style?: TextStyle;
    testID?: string;
}

const CustomStatusEmoji = ({emojiSize, userID, style, testID}: ComponentProps) => {
    const getCustomStatus = makeGetCustomStatus();
    const customStatus = useSelector((state: GlobalState) => {
        return getCustomStatus(state, userID);
    });
    const emojiExists = customStatus && customStatus.emoji;

    if (!emojiExists) {
        return null;
    }

    const testIdPrefix = testID ? `${testID}.` : '';
    return (
        <Text
            style={style}
            testID={`${testIdPrefix}custom_status_emoji.${customStatus.emoji}`}
        >
            <Emoji
                size={emojiSize}
                emojiName={customStatus.emoji}
            />
        </Text>
    );
};

CustomStatusEmoji.defaultProps = {
    emojiSize: 16,
};

export default CustomStatusEmoji;
