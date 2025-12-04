// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';

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
    const action = useMemo(() => ({icon: 'remove' as const, onPress}), [onPress]);
    return (
        <UserChip
            testID={testID}
            action={action}
            showAnimation={true}
            teammateNameDisplay={teammateNameDisplay}
            user={user}
        />
    );
}
