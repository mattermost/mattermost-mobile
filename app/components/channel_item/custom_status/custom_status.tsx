// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {StyleSheet} from 'react-native';

import CustomStatusEmoji from '@components/custom_status/custom_status_emoji';

type Props = {
    customStatus?: UserCustomStatus;
    customStatusExpired: boolean;
    isCustomStatusEnabled: boolean;
    isInfo?: boolean;
    testID?: string;
}

const style = StyleSheet.create({
    customStatusEmoji: {
        color: '#000',
        marginHorizontal: -5,
        top: 3,
    },
    info: {
        marginHorizontal: -15,
    },
});

const CustomStatus = ({customStatus, customStatusExpired, isCustomStatusEnabled, isInfo, testID}: Props) => {
    const showCustomStatusEmoji = Boolean(isCustomStatusEnabled && customStatus?.emoji && !customStatusExpired);

    if (!showCustomStatusEmoji) {
        return null;
    }

    return (
        <CustomStatusEmoji
            customStatus={customStatus!}
            style={[style.customStatusEmoji, isInfo && style.info]}
            testID={testID}
        />
    );
};

export default CustomStatus;
