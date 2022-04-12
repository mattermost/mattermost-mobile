// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';

import {togglePinPost} from '@actions/remote/post';
import {Screens} from '@constants';
import {useServerUrl} from '@context/server';
import {t} from '@i18n';
import {dismissBottomSheet} from '@screens/navigation';

import BaseOption from './base_option';

type PinChannelProps = {
    isPostPinned: boolean;
    postId: string;
}

const PinChannelOption = ({isPostPinned, postId}: PinChannelProps) => {
    const serverUrl = useServerUrl();

    const onPress = useCallback(() => {
        togglePinPost(serverUrl, postId);
        dismissBottomSheet(Screens.POST_OPTIONS);
    }, [postId, serverUrl]);

    let defaultMessage;
    let id;
    let key;

    if (isPostPinned) {
        defaultMessage = 'Unpin from Channel';
        id = t('mobile.post_info.unpin');
        key = 'unpin';
    } else {
        defaultMessage = 'Pin to Channel';
        id = t('mobile.post_info.pin');
        key = 'pin';
    }

    return (
        <BaseOption
            i18nId={id}
            defaultMessage={defaultMessage}
            iconName='pin-outline'
            onPress={onPress}
            testID={`post.options.${key}.channel.option`}
        />
    );
};

export default PinChannelOption;
