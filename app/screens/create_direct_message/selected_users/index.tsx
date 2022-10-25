// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {ScrollView, View} from 'react-native';

import FormattedText from '@components/formatted_text';
import {useTheme} from '@context/theme';
import Button from '@screens/bottom_sheet/button';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import SelectedUser, {UserChipBottomMargin, UserChipHeight} from './selected_user';

type Props = {

    /*
     * An object mapping user ids to a falsey value indicating whether or not they have been selected.
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
    onPress?: (selectedId?: {[id: string]: boolean}) => void;

    /*
     * A handler function that will deselect a user when clicked on.
     */
    onRemove: (id: string) => void;

    /*
     * Name of the button Icon
     */
    buttonIcon: string;

    /*
     * Text displayed on the action button
     */
    buttonText: string;
}

const MaxRows = 3;
const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            flexShrink: 1,
            borderWidth: 1,
            borderBottomWidth: 0,
            backgroundColor: theme.centerChannelBg,
            paddingHorizontal: 20,
            borderTopLeftRadius: 12,
            borderTopRightRadius: 12,
            borderColor: changeOpacity(theme.centerChannelColor, 0.16),
            shadowOffset: {width: 0, height: -4},
            shadowColor: changeOpacity(theme.centerChannelBg, 0.12),
            shadowRadius: 1,
        },
        buttonContainer: {
            marginVertical: 20,
        },
        containerUsers: {
            marginTop: 20,
            maxHeight: (UserChipHeight + UserChipBottomMargin) * MaxRows,
        },
        users: {
            alignItems: 'flex-start',
            flexDirection: 'row',
            flexGrow: 1,
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

export default function SelectedUsers({
    selectedIds,
    teammateNameDisplay,
    warnCount,
    maxCount,
    onPress,
    onRemove,
    buttonIcon,
    buttonText,
}: Props) {
    const theme = useTheme();
    const style = getStyleFromTheme(theme);

    const handleOnPress = useCallback(async () => {
        onPress?.();
    }, [onPress]);

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
            <View style={style.containerUsers}>
                <ScrollView
                    contentContainerStyle={style.users}
                >
                    {users}
                </ScrollView>
            </View>
            {message}

            <View style={style.buttonContainer}>
                <Button
                    onPress={handleOnPress}
                    icon={buttonIcon}
                    text={buttonText}
                />
            </View>
        </View>
    );
}

