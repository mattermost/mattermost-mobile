// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';

import ProfilePicture from '@components/profile_picture';
import SelectedChip from '@components/selected_chip';
import {displayUsername} from '@utils/user';

import type UserModel from '@typings/database/models/servers/user';

type Props = {

    /*
     * How to display the names of users.
     */
    teammateNameDisplay: string;

    /*
     * The user that this component represents.
     */
    user: UserProfile|UserModel;

    /*
     * A handler function that will deselect a user when clicked on.
     */
    onRemove: (id: string) => void;

    /*
     * The test ID.
     */
    testID?: string;
}

export default function SelectedUser({
    teammateNameDisplay,
    user,
    onRemove,
    testID,
}: Props) {
    const intl = useIntl();

    const onPress = useCallback((id: string) => {
        onRemove(id);
    }, [onRemove]);

    const userItemTestID = `${testID}.${user.id}`;

    return (
        <SelectedChip
            id={user.id}
            text={displayUsername(user, intl.locale, teammateNameDisplay)}
            extra={(
                <ProfilePicture
                    author={user}
                    size={20}
                    iconSize={20}
                    testID={`${userItemTestID}.profile_picture`}
                />
            )}
            onRemove={onPress}
            testID={userItemTestID}
        />
    );
}
