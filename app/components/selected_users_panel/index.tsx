// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {View} from 'react-native';

import FormattedText from '@components/formatted_text';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import SelectedUser from './selected_user';

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

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            marginHorizontal: 12,
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

export default function SelectedUsersPanel({
    selectedIds,
    teammateNameDisplay,
    warnCount,
    maxCount,
    onRemove,
}: Props) {
    const theme = useTheme();
    const style = getStyleFromTheme(theme);

    const users = useMemo(() => {
        const u = [];
        for (const id of Object.keys(selectedIds)) {
            if (!selectedIds[id]) {
                continue;
            }

            u.push(
                <SelectedUser
                    key={id}
                    user={selectedIds[id]}
                    teammateNameDisplay={teammateNameDisplay}
                    onRemove={onRemove}
                    testID='create_direct_message.selected_user'
                />,
            );
        }
        return u;
    }, [selectedIds, teammateNameDisplay, onRemove]);

    const showWarn = users.length >= warnCount && users.length < maxCount;

    const message = useMemo(() => {
        if (users.length >= maxCount) {
            return (
                <FormattedText
                    style={style.message}
                    id='mobile.create_direct_message.cannot_add_more'
                    defaultMessage='You cannot add more users'
                />
            );
        } else if (users.length >= warnCount) {
            const remaining = maxCount - users.length;
            if (remaining === 1) {
                return (
                    <FormattedText
                        style={style.message}
                        id='mobile.create_direct_message.one_more'
                        defaultMessage='You can add 1 more user'
                    />
                );
            }
            return (
                <FormattedText
                    style={style.message}
                    id='mobile.create_direct_message.add_more'
                    defaultMessage='You can add {remaining, number} more users'
                    values={{
                        remaining,
                    }}
                />
            );
        }

        return null;
    }, [users.length >= maxCount, showWarn && users.length, theme, maxCount]);

    return (
        <View style={style.container}>
            <View style={style.users}>
                {users}
            </View>
            {message}
        </View>
    );
}

