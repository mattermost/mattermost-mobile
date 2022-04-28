// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {useIntl} from 'react-intl';
import {Text, TouchableOpacity, useWindowDimensions, ViewStyle} from 'react-native';
import {Gesture, GestureDetector, GestureHandlerRootView} from 'react-native-gesture-handler';
import Animated, {Extrapolation, interpolate, runOnJS, useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';

import Toast, {TOAST_HEIGHT} from '@components/toast';
import {Screens} from '@constants';
import {SNACK_BAR_CONFIG, SNACK_BAR_TYPE} from '@constants/snack_bar';
import {TABLET_SIDEBAR_WIDTH} from '@constants/view';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {dismissOverlay} from '@screens/navigation';
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
    const [showSnackBar, setShowSnackBar] = useState<boolean | undefined>();
    const intl = useIntl();
    const theme = useTheme();
    const isTablet = useIsTablet();
    const {width: windowWidth} = useWindowDimensions();
    const offset = useSharedValue(0);
    const startY = useSharedValue(0);
    const isPanning = useSharedValue(false);

    const config = SNACK_BAR_CONFIG[barType];
    const styles = getStyleSheet(theme);

    const onPressHandler = useCallback(() => {
        dismissOverlay(componentId);
        onUndoPress?.();
    }, [onUndoPress, componentId]);

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
                {scale: interpolate(offset.value, [0, 100], [1, 0], Extrapolation.EXTEND)},
            ],
            opacity: interpolate(offset.value, [0, 100], [1, 0], Extrapolation.EXTEND),
        };
    }, [offset.value]);

    const hideSnackBar = () => {
        setShowSnackBar(false);
    };

    const gesture = Gesture.
        // eslint-disable-next-line new-cap
        Pan().
        onStart((st) => {
            startY.value = st.absoluteY;
            isPanning.value = true;
        }).
        activeOffsetY(20).
        onUpdate((e) => {
            if (e.absoluteY >= startY.value) {
                offset.value = e.translationY;
            }
        }).
        onEnd(() => {
            runOnJS(hideSnackBar)();
            isPanning.value = false;
        });

    const animateHiding = () => {
        if (!isPanning.value) {
            offset.value = withTiming(100, {duration: 500}, () => runOnJS(hideSnackBar)());
        }
    };

    useEffect(() => {
        setShowSnackBar(true);
        const t = setTimeout(() => animateHiding(), 3000);
        return () => clearTimeout(t);
    }, []);

    // This effect dismisses the Navigation Overlay after we have hidden the snack bar
    useEffect(() => {
        let t: NodeJS.Timeout;
        if (showSnackBar === false) {
            t = setTimeout(() => {
                dismissOverlay(componentId);
            }, 350);
        }

        return () => {
            if (t) {
                clearTimeout(t);
            }
        };
    }, [showSnackBar]);

    return (
        <GestureHandlerRootView style={{flex: 1, height: 80, width: '100%', position: 'absolute', bottom: 100}}>
            <GestureDetector gesture={gesture}>
                <Animated.View style={animatedMotion}>
                    <Toast
                        animatedStyle={{opacity: 1, height: TOAST_HEIGHT}}
                        message={intl.formatMessage({id: config.id, defaultMessage: config.defaultMessage})}
                        iconName={config.iconName}
                        textStyle={styles.text}
                        style={{width: '100%', opacity: 1}}
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
