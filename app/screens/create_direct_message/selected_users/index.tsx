// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {KeyboardAvoidingView, NativeModules, Platform, ScrollView, View} from 'react-native';
import {useAnimatedStyle, withTiming} from 'react-native-reanimated';

import Toast from '@components/toast';
import TouchableWithFeedback from '@components/touchable_with_feedback';
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
     * A handler function that will deselect a user when clicked on.
     */
    onPress: (selectedId?: {[id: string]: boolean}) => void;

    /*
     * A handler function that will deselect a user when clicked on.
     */
    onRemove: (id: string) => void;

    /*
     * show the toast
     */
    showToast: boolean;

    /*
     * toast Icon
     */
    toastIcon?: string;

    /*
     * toast Message
     */
    toastMessage: string;

    /*
     * callback to set the value of showToast
     */
    setShowToast: (show: boolean) => void;

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
        toast: {
            backgroundColor: theme.centerChannelColor,
            bottom: 8,
            color: changeOpacity(theme.centerChannelColor, 0.6),
            justifyContent: 'bottom',
            position: 'absolute',
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
    showToast = false,
    setShowToast,
    toastIcon,
    toastMessage,
    onPress,
    onRemove,
    buttonIcon,
    buttonText,
}: Props) {
    const theme = useTheme();
    const style = getStyleFromTheme(theme);
    const isTablet = useIsTablet();
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

    const onToastPress = useCallback(() => setShowToast(false), []);

    const animatedStyle = useAnimatedStyle(() => (
        {opacity: withTiming(showToast ? 1 : 0, {duration: 300})}
    ));

    const keyboardBottomMargin = (isTablet ? 0 : BOTTOM_MARGIN);
    const keyboardVerticalOffset = StatusBarManager.HEIGHT + NAVBAR_HEADER_HEIGHT + keyboardBottomMargin;

    const viewPaddingBottom = {paddingBottom: (Platform.OS === 'android' || isTablet) ? BOTTOM_MARGIN : 0};

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={keyboardVerticalOffset}
            style={style.container}
        >
            {showToast &&
                <TouchableWithFeedback onPress={onToastPress}>
                    <Toast
                        animatedStyle={animatedStyle}
                        iconName={toastIcon}
                        style={style.toast}
                        message={toastMessage}
                    />
                </TouchableWithFeedback>
            }
            <View style={viewPaddingBottom}>
                <View style={style.containerUsers}>
                    <ScrollView
                        contentContainerStyle={style.users}
                    >
                        {users}
                    </ScrollView>
                </View>
                <Button
                    onPress={handleOnPress}
                    icon={buttonIcon}
                    text={buttonText}
                />
            </View>
        </KeyboardAvoidingView>
    );
}

