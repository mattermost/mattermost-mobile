// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {useIntl} from 'react-intl';
import {StyleSheet, Text, TouchableOpacity, useWindowDimensions, ViewStyle} from 'react-native';
import {Gesture, GestureDetector, GestureHandlerRootView} from 'react-native-gesture-handler';
import Animated, {useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';

import Toast from '@components/toast';
import {Screens} from '@constants';
import {SNACK_BAR_CONFIG, SNACK_BAR_TYPE} from '@constants/snack_bar';
import {BOTTOM_TAB_HEIGHT, TABLET_SIDEBAR_WIDTH} from '@constants/view';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {dismissOverlay} from '@screens/navigation';
import EphemeralStore from '@store/ephemeral_store';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        text: {
            color: theme.centerChannelBg,
        },
        undo: {
            color: theme.centerChannelBg,
            ...typography('Body', 100, 'SemiBold'),
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
    const [showToast, setShowToast] = useState<boolean | undefined>();
    const intl = useIntl();
    const theme = useTheme();
    const isTablet = useIsTablet();
    const {width: windowWidth} = useWindowDimensions();
    const offset = useSharedValue(0);
    const start = useSharedValue(0);

    const config = SNACK_BAR_CONFIG[barType];
    const styles = getStyleSheet(theme);

    const onPressHandler = useCallback(() => {
        dismissOverlay(componentId);
        onUndoPress?.();
    }, [onUndoPress, componentId]);

    const animatedStyle = useAnimatedStyle(() => {
        const DRAFT_INPUT_HEIGHT = 130;
        let delta: number;

        switch (sourceScreen) {
            case Screens.MENTIONS:
                delta = BOTTOM_TAB_HEIGHT - 15;
                break;
            case Screens.SAVED_POSTS:
                delta = BOTTOM_TAB_HEIGHT + 15;
                break;
            default:
                delta = 0;
        }

        return {
            position: 'absolute',
            bottom: DRAFT_INPUT_HEIGHT - delta,
            opacity: withTiming(showToast ? 1 : 0, {duration: 300}),
        };
    });

    const snackBarStyle = useMemo(() => {
        const diffWidth = windowWidth - TABLET_SIDEBAR_WIDTH;
        const SNACK_BAR_WIDTH = 96;

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
            {
                backgroundColor: theme[config.themeColor],
                width: '96%',
            },
            isTablet && tabletStyle,
        ];
    }, [theme, barType]);

    const animatedMotion = useAnimatedStyle(() => {
        return {
            transform: [
                {translateY: offset.value},
            ],
        };
    }, [offset.value]);

    const gesture = Gesture.
        // eslint-disable-next-line new-cap
        Pan().
        onBegin((e) => {
            start.value = e.y;
        }).
        onEnd((e) => {
            offset.value = withTiming(e.y + 200, {duration: 300});
        });

    useEffect(() => {
        setShowToast(true);
        EphemeralStore.addNavigationOverlay(componentId);
        const t = setTimeout(() => {
            setShowToast(false);
        }, 3000);

        return () => clearTimeout(t);
    }, []);

    useEffect(() => {
        const t = setTimeout(() => {
            if (offset.value > start.value) {
                dismissOverlay(componentId);
            }
        }, 500);

        return () => {
            if (t) {
                clearTimeout(t);
            }
        };
    }, [offset.value, start.value]);

    useEffect(() => {
        let t: NodeJS.Timeout;
        if (showToast === false) {
            t = setTimeout(() => {
                dismissOverlay(componentId);
            }, 700);
        }

        return () => {
            if (t) {
                clearTimeout(t);
            }
        };
    }, [showToast]);

    return (
        <GestureHandlerRootView
            style={[StyleSheet.absoluteFill]}
            pointerEvents={'none'}
        >
            <GestureDetector gesture={gesture}>
                <Animated.View
                    style={[
                        StyleSheet.absoluteFill,
                        animatedMotion,
                    ]}
                >
                    <Toast
                        animatedStyle={animatedStyle}
                        message={intl.formatMessage({id: config.id, defaultMessage: config.defaultMessage})}
                        iconName={config.iconName}
                        textStyle={styles.text}
                        style={snackBarStyle}
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
