// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {useIntl} from 'react-intl';
import {StyleSheet, Text, TouchableOpacity, useWindowDimensions, ViewStyle} from 'react-native';
import {Gesture, GestureDetector, GestureHandlerRootView} from 'react-native-gesture-handler';
import Animated, {runOnJS, useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';

import Toast, { TOAST_HEIGHT } from '@components/toast';
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
            opacity: withTiming(showToast ? 1 : 0, {duration: 300}),
            heigt: TOAST_HEIGHT,
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

    const test = () => {
        console.log('BEGIN');
        // setShowToast(false);
    }

    const gesture = Gesture.Pan().activeOffsetY(20).onUpdate((e) => {
        offset.value = e.translationY
    }).onStart(() => runOnJS(test)());

    useEffect(() => {
        setShowToast(true);
        console.log('SHOW TOAST')
        EphemeralStore.addNavigationOverlay(componentId);
        // const t = setTimeout(() => {
        //     setShowToast(false);
        // }, 3000);

        // return () => clearTimeout(t);
    }, []);

    useEffect(() => {
        const t = setTimeout(() => {
            if (offset.value > start.value) {
                dismissOverlay(componentId);
                console.log('DISMISS')
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
                console.log('DISMISS')
            }, 700);
        }

        return () => {
            if (t) {
                clearTimeout(t);
            }
        };
    }, [showToast]);

    return (
        <GestureHandlerRootView style={{flex: 1, backgroundColor: 'red', height: 80, width: '100%', position: 'absolute', bottom: 100}}>
            <GestureDetector gesture={gesture}>
                <Animated.View style={animatedMotion}>
                    <Toast
                        animatedStyle={{opacity: 1, height: 56}}
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
