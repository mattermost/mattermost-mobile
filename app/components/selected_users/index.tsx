// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {type LayoutChangeEvent, Platform, ScrollView, View} from 'react-native';
import Animated, {useAnimatedStyle, useDerivedValue, useSharedValue, withTiming} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import Button from '@components/button';
import {USER_CHIP_BOTTOM_MARGIN, USER_CHIP_HEIGHT} from '@components/selected_chip';
import Toast from '@components/toast';
import {useTheme} from '@context/theme';
import {useKeyboardHeightWithDuration} from '@hooks/device';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import SelectedUser from './selected_user';

type Props = {

    /**
     * Name of the button Icon
     */
    buttonIcon: string;

    /*
     * Text displayed on the action button
     */
    buttonText: string;

    /**
     * the overlap of the keyboard with this list
     */
    keyboardOverlap?: number;

    /**
     * A handler function that will select or deselect a user when clicked on.
     */
    onPress: (selectedId?: {[id: string]: boolean}) => void;

    /**
     * A handler function that will deselect a user when clicked on.
     */
    onRemove: (id: string) => void;

    /**
     * An object mapping user ids to a falsey value indicating whether or not they have been selected.
     */
    selectedIds: {[id: string]: UserProfile};

    /**
     * callback to set the value of showToast
     */
    setShowToast?: (show: boolean) => void;

    /**
     * show the toast
     */
    showToast?: boolean;

    /**
    * How to display the names of users.
    */
    teammateNameDisplay: string;

    /**
     * test ID
     */
    testID?: string;

    /**
     * toast Icon
     */
    toastIcon?: string;

    /**
     * toast Message
     */
    toastMessage?: string;

    /**
     * Max number of users in the list
     */
    maxUsers?: number;
}

const BUTTON_HEIGHT = 48;
const CHIP_HEIGHT_WITH_MARGIN = USER_CHIP_HEIGHT + USER_CHIP_BOTTOM_MARGIN;
const EXPOSED_CHIP_HEIGHT = 0.33 * USER_CHIP_HEIGHT;
const MAX_CHIP_ROWS = 2;
const SCROLL_MARGIN_TOP = 20;
const SCROLL_MARGIN_BOTTOM = 12;
const USERS_CHIPS_MAX_HEIGHT = (CHIP_HEIGHT_WITH_MARGIN * MAX_CHIP_ROWS) + EXPOSED_CHIP_HEIGHT;
const SCROLL_MAX_HEIGHT = USERS_CHIPS_MAX_HEIGHT + SCROLL_MARGIN_TOP + SCROLL_MARGIN_BOTTOM;
const PANEL_MAX_HEIGHT = SCROLL_MAX_HEIGHT + BUTTON_HEIGHT;
const TABLET_MARGIN_BOTTOM = 20;
const TOAST_BOTTOM_MARGIN = 24;

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            backgroundColor: theme.centerChannelBg,
            borderBottomWidth: 0,
            borderColor: changeOpacity(theme.centerChannelColor, 0.16),
            borderTopLeftRadius: 12,
            borderTopRightRadius: 12,
            borderWidth: 1,
            maxHeight: PANEL_MAX_HEIGHT,
            overflow: 'hidden',
            paddingHorizontal: 20,
            shadowColor: theme.centerChannelColor,
            shadowOffset: {
                width: 0,
                height: 8,
            },
            shadowOpacity: 0.16,
            shadowRadius: 24,
        },
        toast: {
            backgroundColor: theme.errorTextColor,
        },
        usersScroll: {
            marginTop: SCROLL_MARGIN_TOP,
            marginBottom: SCROLL_MARGIN_BOTTOM,
        },
        users: {
            flexDirection: 'row',
            flexGrow: 1,
            flexWrap: 'wrap',
        },
        message: {
            color: theme.centerChannelBg,
            fontSize: 12,
            marginRight: 5,
            marginTop: 10,
            marginBottom: 2,
        },
    };
});

export default function SelectedUsers({
    buttonIcon,
    buttonText,
    keyboardOverlap = 0,
    onPress,
    onRemove,
    selectedIds,
    setShowToast,
    showToast = false,
    teammateNameDisplay,
    testID,
    toastIcon,
    toastMessage,
    maxUsers,
}: Props) {
    const theme = useTheme();
    const style = getStyleFromTheme(theme);
    const keyboard = useKeyboardHeightWithDuration();
    const insets = useSafeAreaInsets();

    const usersChipsHeight = useSharedValue(0);
    const [isVisible, setIsVisible] = useState(false);
    const numberSelectedIds = Object.keys(selectedIds).length;

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
                    testID={`${testID}.selected_user`}
                />,
            );
        }
        return u;
    }, [selectedIds, teammateNameDisplay, onRemove]);

    const totalPanelHeight = useDerivedValue(() => (
        isVisible ?
            usersChipsHeight.value + SCROLL_MARGIN_BOTTOM + SCROLL_MARGIN_TOP + BUTTON_HEIGHT :
            0
    ), [isVisible]);

    const handlePress = useCallback(() => {
        onPress();
    }, [onPress]);

    const onLayout = useCallback((e: LayoutChangeEvent) => {
        usersChipsHeight.value = Math.min(
            USERS_CHIPS_MAX_HEIGHT,
            e.nativeEvent.layout.height,
        );
    }, []);

    const androidMaxHeight = Platform.select({
        android: {
            maxHeight: isVisible ? undefined : 0,
        },
    });

    const animatedContainerStyle = useAnimatedStyle(() => ({
        marginBottom: withTiming(keyboardOverlap + TABLET_MARGIN_BOTTOM, {duration: keyboard.duration}),
        backgroundColor: isVisible ? theme.centerChannelBg : 'transparent',
        ...androidMaxHeight,
    }), [keyboardOverlap, keyboard.duration, isVisible, theme.centerChannelBg]);

    const animatedToastStyle = useAnimatedStyle(() => {
        return {
            bottom: TOAST_BOTTOM_MARGIN + totalPanelHeight.value + insets.bottom,
            opacity: withTiming(showToast ? 1 : 0, {duration: 250}),
            position: 'absolute',
        };
    }, [showToast, insets.bottom]);

    const animatedViewStyle = useAnimatedStyle(() => ({
        height: withTiming(totalPanelHeight.value, {duration: 250}),
        borderWidth: isVisible ? 1 : 0,
        maxHeight: isVisible ? PANEL_MAX_HEIGHT + BUTTON_HEIGHT : 0,
    }), [isVisible]);

    const animatedButtonStyle = useAnimatedStyle(() => ({
        opacity: withTiming(isVisible ? 1 : 0, {duration: isVisible ? 500 : 100}),
    }), [isVisible]);

    useEffect(() => {
        setIsVisible(numberSelectedIds > 0);
    }, [numberSelectedIds > 0]);

    // This effect hides the toast after 4 seconds
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (showToast) {
            timer = setTimeout(() => {
                setShowToast?.(false);
            }, 4000);
        }

        return () => clearTimeout(timer);
    }, [showToast]);

    const isDisabled = Boolean(maxUsers && (numberSelectedIds > maxUsers));
    return (
        <Animated.View style={animatedContainerStyle}>
            {showToast &&
            <Toast
                animatedStyle={animatedToastStyle}
                iconName={toastIcon}
                style={style.toast}
                message={toastMessage}
            />
            }
            <Animated.View style={[style.container, animatedViewStyle]}>
                <ScrollView style={style.usersScroll}>
                    <View
                        style={style.users}
                        onLayout={onLayout}
                    >
                        {users}
                    </View>
                </ScrollView>
                <Animated.View style={animatedButtonStyle}>
                    <Button
                        onPress={handlePress}
                        iconName={buttonIcon}
                        text={buttonText}
                        iconSize={20}
                        theme={theme}
                        buttonType={isDisabled ? 'disabled' : 'default'}
                        emphasis={'primary'}
                        size={'lg'}
                        testID={`${testID}.start.button`}
                    />
                </Animated.View>
            </Animated.View>
        </Animated.View>
    );
}

