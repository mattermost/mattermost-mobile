// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {useIntl} from 'react-intl';

import ProfilePicture from '@components/profile_picture';
import {displayUsername} from '@utils/user';

import BaseChip from './base_chip';

import type UserModel from '@typings/database/models/servers/user';

type SelectedChipProps = {
    user: UserModel | UserProfile;
    onPress: (id: string) => void;
    testID?: string;
    teammateNameDisplay: string;
    showRemoveOption?: boolean;
    showAnimation?: boolean;
}

export default function UserChip({
    testID,
    user,
    teammateNameDisplay,
    onPress: receivedOnPress,
    showRemoveOption,
    showAnimation,
}: SelectedChipProps) {
    const intl = useIntl();

    const onPress = useCallback(() => {
        receivedOnPress(user.id);
    }, [receivedOnPress, user.id]);

    const name = displayUsername(user, intl.locale, teammateNameDisplay);
    const picture = useMemo(() => (
        <ProfilePicture
            author={user}
            size={20}
            iconSize={20}
            testID={`${testID}.profile_picture`}
            showStatus={false}
        />
    ), [testID, user]);

    return (
        <BaseChip
            testID={testID}
            onPress={onPress}
            showRemoveOption={showRemoveOption}
            showAnimation={showAnimation}
            label={name}
            prefix={picture}
        />
    );
}
