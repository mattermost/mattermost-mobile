// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';

import {t} from '@i18n';

import BaseOption from './base_option';

type PinChannelProps = {
    isPostPinned: boolean;
}

//fixme: wire up handlePinChannel
const PinChannelOption = ({isPostPinned}: PinChannelProps) => {
    const handlePinPost = () => null;
    const handleUnpinPost = () => null;

    const config = useMemo(() => {
        let key;
        let message;
        let onPress;
        const icon = 'pin-outline';

        if (isPostPinned) {
            key = 'unpin';
            message = {id: t('mobile.post_info.unpin'), defaultMessage: 'Unpin from Channel'};
            onPress = handleUnpinPost;
        } else {
            key = 'pin';
            message = {id: t('mobile.post_info.pin'), defaultMessage: 'Pin to Channel'};
            onPress = handlePinPost;
        }
        return {
            key, message, onPress, icon,
        };
    }, [isPostPinned, handlePinPost, handleUnpinPost]);

    return (
        <BaseOption
            i18nId={config.message.id}
            defaultMessage={config.message.defaultMessage}
            iconName={config.icon}
            onPress={config.onPress}
            optionType={`post.options.${config.key}.channel`}
        />
    );
};

export default PinChannelOption;
