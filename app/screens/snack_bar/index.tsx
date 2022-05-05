// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {DeviceEventEmitter, Text, TouchableOpacity, useWindowDimensions, ViewStyle} from 'react-native';
import {Gesture, GestureDetector, GestureHandlerRootView} from 'react-native-gesture-handler';
import {Navigation} from 'react-native-navigation';
import Animated, {
    AnimatedStyleProp,
    Extrapolation,
    FadeIn,
    interpolate,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';

import Toast, {TOAST_HEIGHT} from '@components/toast';
import {Navigation as NavigationConstants, Screens} from '@constants';
import {SNACK_BAR_CONFIG, SNACK_BAR_TYPE} from '@constants/snack_bar';
import {TABLET_SIDEBAR_WIDTH} from '@constants/view';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {dismissOverlay} from '@screens/navigation';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

const SNACK_BAR_WIDTH = 96;

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        text: {
            color: theme.centerChannelBg,
        },
        undo: {
            color: theme.centerChannelBg,
            ...typography('Body', 100, 'SemiBold'),
        },
        gestureRoot: {
            flex: 1,
            height: 80,
            width: '100%',
            position: 'absolute',
            bottom: 104,
        },
        toast: {
            width: '100%',
            opacity: 1,
            backgroundColor: theme.centerChannelColor,
        },
        mobile: {
            backgroundColor: theme.centerChannelColor,
            width: `${SNACK_BAR_WIDTH}%`,
            opacity: 1,
            height: TOAST_HEIGHT,
            alignSelf: 'center' as const,
            borderRadius: 9,
            shadowColor: '#1F000000',
            shadowOffset: {
                width: 0,
                height: 6,
            },
            shadowRadius: 4,
            shadowOpacity: 0.12,
            elevation: 2,
        },
    };
});

type SnackBarProps = {
    componentId: string;
    onUndoPress?: () => void;
    barType: keyof typeof SNACK_BAR_TYPE;
    sourceScreen: typeof Screens[keyof typeof Screens];
}

const SnackBar = ({barType, componentId, onUndoPress, sourceScreen}: SnackBarProps) => {
    const [showSnackBar, setShowSnackBar] = useState<boolean | undefined>();
    const intl = useIntl();
    const theme = useTheme();
    const isTablet = useIsTablet();
    const {width: windowWidth} = useWindowDimensions();
    const offset = useSharedValue(0);
    const isPanned = useSharedValue(false);
    const baseTimer = useRef<NodeJS.Timeout>();

    const config = SNACK_BAR_CONFIG[barType];
    const styles = getStyleSheet(theme);

    const onPressHandler = useCallback(() => {
        dismissOverlay(componentId);
        onUndoPress?.();
    }, [onUndoPress, componentId]);

    const snackBarStyle = useMemo(() => {
        const diffWidth = windowWidth - TABLET_SIDEBAR_WIDTH;

        let tabletStyle: Partial<ViewStyle>;

        switch (true) {
            case sourceScreen === Screens.THREAD :
                tabletStyle = {
                    marginLeft: 0,
                    width: `${SNACK_BAR_WIDTH}%`,
                    marginBottom: 30,
                };
                break;
            case sourceScreen === Screens.SAVED_POSTS :
                tabletStyle = {
                    marginBottom: 20,
                    marginLeft: TABLET_SIDEBAR_WIDTH,
                    width: (SNACK_BAR_WIDTH / 100) * diffWidth,
                };
                break;
            case [Screens.PERMALINK, Screens.MENTIONS].includes(sourceScreen):
                tabletStyle = {
                    marginBottom: 0,
                    marginLeft: 0,
                    width: (SNACK_BAR_WIDTH / 100) * windowWidth,
                };
                break;
            default:
                tabletStyle = {
                    marginBottom: 40,
                    marginLeft: TABLET_SIDEBAR_WIDTH,
                    width: (SNACK_BAR_WIDTH / 100) * diffWidth,
                };
        }

        return [
            styles.mobile,
            isTablet && tabletStyle,
        ] as AnimatedStyleProp<ViewStyle>;
    }, [theme, barType]);

    const animatedMotion = useAnimatedStyle(() => {
        return {
            opacity: interpolate(offset.value, [0, 100], [1, 0], Extrapolation.EXTEND),
            ...(isPanned.value && {
                transform: [
                    {translateY: offset.value},
                ],
            }),
        };
    }, [offset.value, isPanned.value]);

    const hideSnackBar = () => {
        setShowSnackBar(false);
    };

    const stopTimers = () => {
        if (baseTimer.current) {
            clearTimeout(baseTimer.current);
        }
    };

    const gesture = Gesture.
        // eslint-disable-next-line new-cap
        Pan().
        activeOffsetY(20).
        onStart(() => {
            isPanned.value = true;
            runOnJS(stopTimers)();
            offset.value = withTiming(100, {duration: 200});
        }).
        onEnd(() => {
            runOnJS(hideSnackBar)();
        });

    const animateHiding = (forceHiding: boolean) => {
        const duration = forceHiding ? 0 : 200;
        offset.value = withTiming(200, {duration}, () => runOnJS(hideSnackBar)());
    };

    // This effect hides the snack bar after 3 seconds
    useEffect(() => {
        baseTimer.current = setTimeout(() => {
            if (!isPanned.value) {
                animateHiding(false);
            }
        }, 3000);

        return () => {
            if (baseTimer.current) {
                clearTimeout(baseTimer.current);
            }
        };
    }, [isPanned.value]);

    // This effect dismisses the Navigation Overlay after we have hidden the snack bar
    useEffect(() => {
        if (showSnackBar === false) {
            dismissOverlay(componentId);
        }
    }, [showSnackBar]);

    // This effect checks if we are navigating away and if so, it dismisses the snack bar
    useEffect(() => {
        const onHideSnackBar = () => animateHiding(true);
        const screenWillAppear = Navigation.events().registerComponentWillAppearListener(onHideSnackBar);
        const screenDidDisappear = Navigation.events().registerComponentDidDisappearListener(onHideSnackBar);
        const tabPress = DeviceEventEmitter.addListener('tabPress', onHideSnackBar);
        const navigateToTab = DeviceEventEmitter.addListener(NavigationConstants.NAVIGATE_TO_TAB, onHideSnackBar);

        return () => {
            screenWillAppear.remove();
            screenDidDisappear.remove();
            tabPress.remove();
            navigateToTab.remove();
        };
    }, []);

    return (
        <GestureHandlerRootView style={styles.gestureRoot}>
            <GestureDetector gesture={gesture}>
                <Animated.View
                    style={animatedMotion}
                    entering={FadeIn.duration(300)}
                >
                    <Toast
                        animatedStyle={snackBarStyle}
                        message={intl.formatMessage({id: config.id, defaultMessage: config.defaultMessage})}
                        iconName={config.iconName}
                        textStyle={styles.text}
                        style={styles.toast}
                    >
                        {config.canUndo && onUndoPress && (
                            <TouchableOpacity onPress={onPressHandler}>
                                <Text style={styles.undo}>
                                    {intl.formatMessage({
                                        id: 'snack.bar.undo',
                                        defaultMessage: 'Undo',
                                    })}
                                </Text>
                            </TouchableOpacity>
                        )}
                    </Toast>
                </Animated.View>
            </GestureDetector>
        </GestureHandlerRootView>
    );
};

export default SnackBar;
