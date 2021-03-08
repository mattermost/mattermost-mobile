// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';
import {makeGetCustomStatus, isCustomStatusEnabled} from '@selectors/custom_status';
import {useSelector} from 'react-redux';
import {GlobalState} from '@mm-redux/types/store';
import Emoji from '@components/emoji';

interface ComponentProps {
    emojiSize?: number;
    userID?: string;
}

const CustomStatusEmoji = (props: ComponentProps) => {
    const getCustomStatus = makeGetCustomStatus();
    const {emojiSize, userID} = props;
    const customStatusEnabled = useSelector(isCustomStatusEnabled);
    const customStatus = useSelector((state: GlobalState) => {
        return getCustomStatus(state, userID);
    });
    const emojiExists = customStatusEnabled && customStatus && customStatus.emoji;
    if (!emojiExists) {
        return null;
    }

    return (
        <Emoji
            size={emojiSize}
            emojiName={customStatus.emoji}
        />
    );
};

CustomStatusEmoji.defaultProps = {
    emojiSize: 16,
};

export default CustomStatusEmoji;
