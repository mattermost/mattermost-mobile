// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {useIntl} from 'react-intl';
import {KeyboardAvoidingView, NativeModules, Platform, ScrollView, View} from 'react-native';

import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import Button from '@screens/bottom_sheet/button';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import SelectedUser, {USER_CHIP_BOTTOM_MARGIN, USER_CHIP_HEIGHT} from './selected_user';

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
    onPress: (selectedId?: {[id: string]: boolean}) => void;

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

const BOTTOM_MARGIN = 20;
const EXPOSED_CHIP_HEIGHT = 0.33 * USER_CHIP_HEIGHT;
const MAX_CHIP_ROWS = 3;
const NAVBAR_HEADER_HEIGHT = 64;
const SCROLL_PADDING_TOP = 20;
const CHIP_HEIGHT_WITH_MARGIN = USER_CHIP_HEIGHT + USER_CHIP_BOTTOM_MARGIN;

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            backgroundColor: theme.centerChannelBg,
            borderBottomWidth: 0,
            borderColor: changeOpacity(theme.centerChannelColor, 0.16),
            borderTopLeftRadius: 12,
            borderTopRightRadius: 12,
            borderWidth: 1,
            elevation: 4,
            paddingHorizontal: 20,
            shadowColor: theme.centerChannelColor,
            shadowOffset: {
                width: 0,
                height: 8,
            },
            shadowOpacity: 0.16,
            shadowRadius: 24,
        },
        containerUsers: {
            maxHeight: SCROLL_PADDING_TOP + (CHIP_HEIGHT_WITH_MARGIN * MAX_CHIP_ROWS) + EXPOSED_CHIP_HEIGHT,
        },
        users: {
            paddingTop: SCROLL_PADDING_TOP,
            paddingBottom: 12,
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
    const isTablet = useIsTablet();
    const {formatMessage} = useIntl();
    const {StatusBarManager} = NativeModules;

    const handleOnPress = async () => {
        onPress();
    };

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

    const keyboardBottomMargin = (isTablet ? 0 : BOTTOM_MARGIN);
    const keyboardVerticalOffset = StatusBarManager.HEIGHT + NAVBAR_HEADER_HEIGHT + keyboardBottomMargin;

    const viewPaddingBottom = {paddingBottom: (Platform.OS === 'android' || isTablet) ? BOTTOM_MARGIN : 0};

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={keyboardVerticalOffset}
            style={style.container}
        >
            <View style={viewPaddingBottom} >
                <View style={style.containerUsers}>
                    <ScrollView
                        contentContainerStyle={style.users}
                    >
                        {users}
                    </ScrollView>
                </View>
                {message}
                <Button
                    onPress={handleOnPress}
                    icon={buttonIcon}
                    text={buttonText}
                />
            </View>
        </KeyboardAvoidingView>
    );
}

