// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {useIntl} from 'react-intl';

import ProfilePicture from '@components/profile_picture';
import {displayUsername} from '@utils/user';

import BaseChip from './base_chip';

import type UserModel from '@typings/database/models/servers/user';

type SelectedChipProps = {
    user: UserModel | UserProfile;
    onPress?: (id: string) => void;
    testID?: string;
    teammateNameDisplay: string;
    action?: {
        icon: 'remove' | 'downArrow';
        onPress?: (id: string) => void;
    };
    showAnimation?: boolean;
}

export default function UserChip({
    testID,
    user,
    teammateNameDisplay,
    onPress: receivedOnPress,
    action: receivedAction,
    showAnimation,
}: SelectedChipProps) {
    const intl = useIntl();

    const onPress = useMemo(() => {
        if (!receivedOnPress) {
            return undefined;
        }
        return () => receivedOnPress(user.id);
    }, [receivedOnPress, user.id]);

    const action = useMemo(() => {
        if (!receivedAction) {
            return undefined;
        }
        const onActionPress = receivedAction.onPress ? (() => receivedAction.onPress?.(user.id)) : undefined;
        return {icon: receivedAction.icon, onPress: onActionPress};
    }, [receivedAction, user.id]);

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
            action={action}
            showAnimation={showAnimation}
            label={name}
            prefix={picture}
        />
    );
}
