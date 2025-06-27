// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {defineMessage, useIntl} from 'react-intl';
import {
    DeviceEventEmitter,
    Text,
    TouchableOpacity,
    type StyleProp,
    type ViewStyle,
} from 'react-native';
import {Gesture, GestureDetector, GestureHandlerRootView} from 'react-native-gesture-handler';
import {type ComponentEvent, Navigation} from 'react-native-navigation';
import Animated, {
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
import {MESSAGE_TYPE, SNACK_BAR_CONFIG} from '@constants/snack_bar';
import {TABLET_SIDEBAR_WIDTH} from '@constants/view';
import {useTheme} from '@context/theme';
import {useIsTablet, useWindowDimensions} from '@hooks/device';
import SecurityManager from '@managers/security_manager';
import {dismissOverlay} from '@screens/navigation';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import type {AvailableScreens} from '@typings/screens/navigation';
import type {ShowSnackBarArgs} from '@utils/snack_bar';

type SnackBarProps = {
    componentId: AvailableScreens;
    sourceScreen: AvailableScreens;
} & ShowSnackBarArgs;

const SNACK_BAR_WIDTH = 96;
const SNACK_BAR_HEIGHT = 56;
const SNACK_BAR_BOTTOM_RATIO = 0.04;

const caseScreens: AvailableScreens[] = [Screens.PERMALINK, Screens.MANAGE_CHANNEL_MEMBERS, Screens.MENTIONS, Screens.SAVED_MESSAGES];

const DEFAULT_ICON = 'alert-outline';

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
            width: '100%',
            position: 'absolute',
            height: SNACK_BAR_HEIGHT,
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

const defaultMessage = defineMessage({
    id: 'snack.bar.default',
    defaultMessage: 'Error',
});

const SnackBar = ({
    barType,
    messageValues,
    componentId,
    onAction,
    sourceScreen,
    customMessage,
    type,
}: SnackBarProps) => {
    const [showSnackBar, setShowSnackBar] = useState<boolean | undefined>();
    const intl = useIntl();
    const theme = useTheme();
    const isTablet = useIsTablet();
    const {width: windowWidth, height: windowHeight} = useWindowDimensions();
    const offset = useSharedValue(0);
    const isPanned = useSharedValue(false);
    const baseTimer = useRef<NodeJS.Timeout>();
    const mounted = useRef(false);
    const userHasUndo = useRef(false);

    let config;
    if (barType && SNACK_BAR_CONFIG[barType]) {
        config = SNACK_BAR_CONFIG[barType];
    } else {
        config = {
            message: defaultMessage,
            iconName: DEFAULT_ICON,
            canUndo: false,
            type,
        };
    }

    const styles = getStyleSheet(theme);
    const gestureRootStyle = useMemo(() => {
        return {
            bottom: SNACK_BAR_BOTTOM_RATIO * windowHeight,
        };
    }, [windowHeight]);

    const snackBarStyle = useMemo(() => {
        const diffWidth = windowWidth - TABLET_SIDEBAR_WIDTH;
        let tabletStyle: Partial<ViewStyle>;

        switch (true) {
            case sourceScreen === Screens.THREAD:
                tabletStyle = {
                    marginLeft: 0,
                    width: `${SNACK_BAR_WIDTH}%`,
                };
                break;
            case sourceScreen === Screens.CHANNEL_INFO:
                tabletStyle = {
                    marginBottom: 40,
                    marginLeft: 0,
                    width: (SNACK_BAR_WIDTH / 100) * diffWidth,
                };
                break;
            case caseScreens.includes(sourceScreen):
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
        ] as StyleProp<ViewStyle>;
    }, [windowWidth, styles.mobile, isTablet, sourceScreen]);

    const toastStyle = useMemo(() => {
        let backgroundColor: string;
        switch (config?.type) {
            case MESSAGE_TYPE.SUCCESS:
                backgroundColor = theme.onlineIndicator;
                break;
            case MESSAGE_TYPE.ERROR:
                backgroundColor = theme.errorTextColor;
                break;
            default:
                backgroundColor = theme.centerChannelColor;
                break;
        }
        return [styles.toast, {backgroundColor}];
    }, [config?.type, styles.toast, theme.onlineIndicator, theme.errorTextColor, theme.centerChannelColor]);

    const animatedMotion = useAnimatedStyle(() => {
        return {

            opacity: interpolate(offset.value, [0, 100], [1, 0], Extrapolation.EXTEND),
            ...(isPanned.value && {
                transform: [
                    {translateY: offset.value},
                ],
            }),
        };
    });

    const hideSnackBar = () => {
        if (mounted?.current) {
            setShowSnackBar(false);
        }
    };

    const stopTimers = () => {
        if (baseTimer?.current) {
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

    const animateHiding = useCallback((forceHiding: boolean) => {
        const duration = forceHiding ? 0 : 200;
        offset.value = withTiming(200, {duration}, () => runOnJS(hideSnackBar)());
    }, [offset]);

    const onUndoPressHandler = () => {
        userHasUndo.current = true;
        animateHiding(false);
    };

    // This effect hides the snack bar after 3 seconds
    useEffect(() => {
        mounted.current = true;
        baseTimer.current = setTimeout(() => {
            if (!isPanned.value) {
                animateHiding(false);
            }
        }, 3000);

        return () => {
            stopTimers();
            mounted.current = false;
        };
    }, []);

    // This effect dismisses the Navigation Overlay after we have hidden the snack bar
    useEffect(() => {
        if (showSnackBar === false) {
            if (userHasUndo?.current) {
                onAction?.();
            }
            dismissOverlay(componentId);
        }
    }, [showSnackBar, onAction, componentId]);

    // This effect checks if we are navigating away and if so, it dismisses the snack bar
    useEffect(() => {
        const onHideSnackBar = (event?: ComponentEvent) => {
            const evtComponentId = event?.componentId;
            if ((componentId !== evtComponentId) && (sourceScreen !== evtComponentId)) {
                animateHiding(true);
            }
        };

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
    }, [animateHiding, componentId, sourceScreen]);

    const message = customMessage || intl.formatMessage(config.message, messageValues);

    return (
        <GestureHandlerRootView
            style={[styles.gestureRoot, gestureRootStyle]}
        >
            <GestureDetector gesture={gesture}>
                <Animated.View
                    style={animatedMotion}
                    nativeID={SecurityManager.getShieldScreenId(componentId)}
                >
                    <Animated.View
                        entering={FadeIn.duration(300)}
                    >
                        <Toast
                            animatedStyle={snackBarStyle}
                            iconName={config.iconName}
                            message={message}
                            style={toastStyle}
                            textStyle={styles.text}
                            testID='toast'
                        >
                            {config.canUndo && onAction && (
                                <TouchableOpacity onPress={onUndoPressHandler}>
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
                </Animated.View>
            </GestureDetector>
        </GestureHandlerRootView>
    );
};

export default SnackBar;
