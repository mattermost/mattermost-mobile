// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import SelectedUserChip from '@components/chips/selected_user_chip';

import type UserModel from '@typings/database/models/servers/user';

type SelectedChipProps = {
    user?: UserModel;
    onPress: (id: string) => void;
    testID?: string;
    teammateNameDisplay: string;
}

export default function SelectedUserChipById({
    testID,
    user,
    teammateNameDisplay,
    onPress,
}: SelectedChipProps) {
    if (!user) {
        return null;
    }

    return (
        <SelectedUserChip
            testID={testID}
            onPress={onPress}
            teammateNameDisplay={teammateNameDisplay}
            user={user}
        />
    );
}
