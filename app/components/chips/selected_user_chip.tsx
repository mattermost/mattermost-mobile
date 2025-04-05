// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import UserChip from './user_chip';

import type UserModel from '@typings/database/models/servers/user';

type SelectedChipProps = {
    user: UserModel | UserProfile;
    onPress: (id: string) => void;
    testID?: string;
    teammateNameDisplay: string;
}

export default function SelectedUserChip({
    testID,
    user,
    teammateNameDisplay,
    onPress,
}: SelectedChipProps) {
    return (
        <UserChip
            testID={testID}
            onPress={onPress}
            showRemoveOption={true}
            showAnimation={true}
            teammateNameDisplay={teammateNameDisplay}
            user={user}
        />
    );
}
