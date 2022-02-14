// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {t} from '@i18n';

import BaseOption from './base_option';

type PinChannelProps = {
    isPostPinned: boolean;
}

//fixme: wire up handlePinChannel
const PinChannelOption = ({isPostPinned}: PinChannelProps) => {
    //todo:  add useCallback for the handler callbacks
    const handlePinPost = () => null;
    const handleUnpinPost = () => null;

    let defaultMessage;
    let id;
    let key;
    let onPress;

    if (isPostPinned) {
        defaultMessage = 'Unpin from Channel';
        id = t('mobile.post_info.unpin');
        key = 'unpin';
        onPress = handleUnpinPost;
    } else {
        defaultMessage = 'Pin to Channel';
        id = t('mobile.post_info.pin');
        key = 'pin';
        onPress = handlePinPost;
    }

    return (
        <BaseOption
            i18nId={id}
            defaultMessage={defaultMessage}
            iconName='pin-outline'
            onPress={onPress}
            testID={`post.options.${key}.channel`}
        />
    );
};

export default PinChannelOption;
