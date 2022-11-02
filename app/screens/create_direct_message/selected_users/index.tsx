// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {KeyboardAvoidingView, NativeModules, Platform, ScrollView} from 'react-native';
import Animated, {SlideInDown, SlideInUp, useAnimatedStyle, withTiming} from 'react-native-reanimated';

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
    enabled?: boolean;

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

const EXPOSED_CHIP_HEIGHT = 0.33 * USER_CHIP_HEIGHT;
const MAX_CHIP_ROWS = 3;
const NAVBAR_HEADER_HEIGHT = 64;
const SCROLL_PADDING_TOP = 20;
const CHIP_HEIGHT_WITH_MARGIN = USER_CHIP_HEIGHT + USER_CHIP_BOTTOM_MARGIN;
const TABLET_MARGIN_BOTTOM = 20;

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
    enabled = true,
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
    const [isVisible, setIsVisible] = useState(false);

    const keyboardVerticalOffset = StatusBarManager.HEIGHT + NAVBAR_HEADER_HEIGHT;

    useEffect(() => {
        setIsVisible(Boolean(Object.keys(selectedIds).length));
    }, [selectedIds]);

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

    const animatedToastStyle = useAnimatedStyle(() => (
        {opacity: withTiming(showToast ? 1 : 0, {duration: 300})}
    ));

    return (
        <>
            {enabled && isVisible && (
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    keyboardVerticalOffset={keyboardVerticalOffset}
                >
                    <Animated.View
                        entering={SlideInDown.duration(200)}
                        exiting={SlideInUp.duration(200)}
                        style={[style.container, {marginBottom: isTablet ? TABLET_MARGIN_BOTTOM : 0}]}
                    >
                        {showToast &&
                            <TouchableWithFeedback onPress={onToastPress}>
                                <Toast
                                    animatedStyle={animatedToastStyle}
                                    iconName={toastIcon}
                                    style={style.toast}
                                    message={toastMessage}
                                />
                            </TouchableWithFeedback>
                        }
                        <ScrollView
                            contentContainerStyle={style.users}
                            style={style.containerUsers}
                        >
                            {users}
                        </ScrollView>
                        <Button
                            onPress={handleOnPress}
                            icon={buttonIcon}
                            text={buttonText}
                        />
                    </Animated.View>
                </KeyboardAvoidingView>
            )}
        </>
    );
}

