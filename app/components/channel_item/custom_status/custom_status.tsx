// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import CustomStatusEmoji from '@components/custom_status/custom_status_emoji';

type Props = {
    customStatus?: UserCustomStatus;
    customStatusExpired: boolean;
    isCustomStatusEnabled: boolean;
}

const CustomStatus = ({customStatus, customStatusExpired, isCustomStatusEnabled}: Props) => {
    const showCustomStatusEmoji = Boolean(isCustomStatusEnabled && customStatus?.emoji && !customStatusExpired);

    if (!showCustomStatusEmoji) {
        return null;
    }

    return (
        <CustomStatusEmoji
            customStatus={customStatus!}
        />
    );
};

export default CustomStatus;
