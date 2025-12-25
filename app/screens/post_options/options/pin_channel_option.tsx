// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {defineMessages} from 'react-intl';

import {togglePinPost} from '@actions/remote/post';
import {BaseOption} from '@components/common_post_options';
import {useServerUrl} from '@context/server';
import {dismissBottomSheet} from '@utils/navigation/adapter';

type PinChannelProps = {
    isPostPinned: boolean;
    postId: string;
}

const messages = defineMessages({
    pin: {
        id: 'mobile.post_info.pin',
        defaultMessage: 'Pin to Channel',
    },
    unpin: {
        id: 'mobile.post_info.unpin',
        defaultMessage: 'Unpin from Channel',
    },
});

const PinChannelOption = ({isPostPinned, postId}: PinChannelProps) => {
    const serverUrl = useServerUrl();

    const onPress = useCallback(async () => {
        await dismissBottomSheet();
        togglePinPost(serverUrl, postId);
    }, [postId, serverUrl]);

    let message;
    let key;

    if (isPostPinned) {
        message = messages.unpin;
        key = 'unpin';
    } else {
        message = messages.pin;
        key = 'pin';
    }

    return (
        <BaseOption
            message={message}
            iconName='pin-outline'
            onPress={onPress}
            testID={`post_options.${key}_post.option`}
        />
    );
};

export default PinChannelOption;
