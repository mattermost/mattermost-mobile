// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {StyleSheet} from 'react-native';

import CustomStatusEmoji from '@components/custom_status/custom_status_emoji';

type Props = {
    customStatus?: UserCustomStatus;
    customStatusExpired: boolean;
    isCustomStatusEnabled: boolean;
}

const style = StyleSheet.create({
    customStatusEmoji: {
        color: '#000',
        marginHorizontal: 5,
        marginTop: 1,
    },
});

const CustomStatus = ({customStatus, customStatusExpired, isCustomStatusEnabled}: Props) => {
    const showCustomStatusEmoji = Boolean(isCustomStatusEnabled && customStatus && !customStatusExpired);

    if (!showCustomStatusEmoji) {
        return null;
    }

    return (
        <CustomStatusEmoji
            customStatus={customStatus!}
            style={style.customStatusEmoji}
            testID={`channel_list_item.custom_status.${customStatus!.emoji}-${customStatus!.text}`}
        />
    );
};

export default CustomStatus;
