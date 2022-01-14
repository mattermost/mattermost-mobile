// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View} from 'react-native';

import FormattedText from '@components/formatted_text';
import {useTheme} from '@context/theme';
import SelectedUser from '@screens/more_dms/selected_users/selected_user';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

type Props = {

    /*
     * An object mapping user ids to a falsey value indicating whether or not they've been selected.
     */
    selectedIds: {[id: string]: UserProfile};

    /*
         * How to display the names of users.
         */
    teammateNameDisplay: string;

    /*
         * The number of users that will be selected when we start to display a message indicating
         * the remaining number of users that can be selected.
         */
    warnCount: number;

    /*
         * The maximum number of users that can be selected.
         */
    maxCount: number;

    /*
         * A handler function that will deselect a user when clicked on.
         */
    onRemove: (id: string) => void;
}
export default function SelectedUsers({
    selectedIds,
    teammateNameDisplay,
    warnCount,
    maxCount,
    onRemove,
}: Props) {
    const theme = useTheme();
    const style = getStyleFromTheme(theme);

    const users = [];
    for (const id of Object.keys(selectedIds)) {
        if (!selectedIds[id]) {
            continue;
        }

        users.push(
            <SelectedUser
                key={id}
                user={selectedIds[id]}
                teammateNameDisplay={teammateNameDisplay}
                onRemove={onRemove}
                testID='more_direct_messages.selected_user'
            />,
        );
    }

    if (users.length === 0) {
        return null;
    }

    let message = null;
    if (users.length >= maxCount) {
        message = (
            <FormattedText
                style={style.message}
                id='mobile.more_dms.cannot_add_more'
                defaultMessage='You cannot add more users'
            />
        );
    } else if (users.length >= warnCount) {
        const remaining = maxCount - users.length;
        if (remaining === 1) {
            message = (
                <FormattedText
                    style={style.message}
                    id='mobile.more_dms.one_more'
                    defaultMessage='You can add 1 more user'
                />
            );
        } else {
            message = (
                <FormattedText
                    style={style.message}
                    id='mobile.more_dms.add_more'
                    defaultMessage='You can add {remaining, number} more users'
                    values={{
                        remaining,
                    }}
                />
            );
        }
    }

    return (
        <View style={style.container}>
            <View style={style.users}>
                {users}
            </View>
            {message}
        </View>
    );
}

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            marginLeft: 5,
            marginBottom: 5,
        },
        users: {
            alignItems: 'flex-start',
            flexDirection: 'row',
            flexWrap: 'wrap',
        },
        message: {
            color: changeOpacity(theme.centerChannelColor, 0.6),
            fontSize: 12,
            marginRight: 5,
            marginTop: 10,
            marginBottom: 2,
        },
    };
});
