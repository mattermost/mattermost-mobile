// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import BottomSheetM, {BottomSheetBackdrop, type BottomSheetBackdropProps} from '@gorhom/bottom-sheet';
import React, {forwardRef, type ReactNode, useCallback, useEffect, useImperativeHandle, useMemo, useRef} from 'react';
import {DeviceEventEmitter, type StyleProp, View, type ViewStyle} from 'react-native';
import {ReduceMotion, useReducedMotion, type WithSpringConfig} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {Events} from '@constants';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import useDidMount from '@hooks/did_mount';
import {navigateBack} from '@screens/navigation';
import BottomSheetStore from '@store/bottom_sheet_store';
import {hapticFeedback} from '@utils/general';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import BottomSheetButton, {BUTTON_HEIGHT} from './button';
import EmptyBottomSheetFooter from './footer';
import {useBottomSheetStyle} from './hooks';

import type {AvailableScreens} from '@typings/screens/navigation';

export {default as BottomSheetContent, TITLE_HEIGHT} from './content';

export {BUTTON_HEIGHT, BottomSheetButton};

export type BottomSheetRef = {
    close: () => void;
};

type Props = {
    screen: AvailableScreens;
    contentStyle?: StyleProp<ViewStyle>;
    initialSnapIndex?: number;
    footerComponent?: React.FC<unknown>;
    renderContent: () => ReactNode;
    snapPoints?: Array<string | number>;
    enableDynamicSizing?: boolean;
    testID?: string;
    keyboardBehavior?: 'extend' | 'fillParent' | 'interactive';
    keyboardBlurBehavior?: 'none' | 'restore';
}

const PADDING_TOP_MOBILE = 20;

export const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        bottomSheet: {
            borderTopStartRadius: 24,
            borderTopEndRadius: 24,
            shadowOffset: {
                width: 0,
                height: 8,
            },
            shadowOpacity: 0.12,
            shadowRadius: 24,
            shadowColor: '#000',
            elevation: 24,
            flexGrow: 1,
            height: 1,
        },
        bottomSheetBackground: {
            backgroundColor: 'transparent',
            borderColor: changeOpacity(theme.centerChannelColor, 0.16),
        },
        content: {
            flex: 1,
            paddingHorizontal: 20,
            paddingTop: PADDING_TOP_MOBILE,
        },
        view: {
            flex: 1,
        },
        indicator: {
            backgroundColor: 'white',
        },
        indicatorContainer: {
            marginTop: 0,
        },
    };
});

export const animatedConfig: Omit<WithSpringConfig, 'velocity'> = {
    damping: 50,
    mass: 0.3,
    stiffness: 121.6,
    overshootClamping: true,
    energyThreshold: 0.01,
};

const BottomSheet = forwardRef<BottomSheetRef, Props>(({
    screen,
    contentStyle,
    initialSnapIndex = 1,
    footerComponent,
    renderContent,
    snapPoints = [1, '50%', '80%'],
    testID,
    enableDynamicSizing = false,
    keyboardBehavior = 'extend',
    keyboardBlurBehavior = 'restore',
}: Props, ref) => {
    const isClosing = useRef(false);
    const reducedMotion = useReducedMotion();
    const sheetRef = useRef<BottomSheetM>(null);
    const insets = useSafeAreaInsets();
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const screenStyle = useBottomSheetStyle();

    const animationConfigs = useMemo(() => ({
        ...animatedConfig,
        reduceMotion: reducedMotion ? ReduceMotion.Always : ReduceMotion.Never,
    }), [reducedMotion]);

    const close = useCallback(() => {
        isClosing.current = true;
        BottomSheetStore.reset();
        navigateBack();
    }, []);

    useEffect(() => {
        const listenerfn = () => {
            if (sheetRef.current) {
                sheetRef.current.close();
            } else if (!isClosing.current) {
                close();
            }
        };
        const listener = DeviceEventEmitter.addListener(Events.CLOSE_BOTTOM_SHEET, listenerfn);

        return () => listener.remove();
    }, [close]);

    const handleClose = useCallback(() => {
        if (sheetRef.current) {
            sheetRef.current.close();
        } else if (!isClosing.current) {
            close();
        }
    }, [close]);

    const handleChange = useCallback((index: number) => {
        if (index <= 0 && !isClosing.current) {
            close();
        }
    }, [close]);

    const onBottomSheetClose = useCallback(() => {
        if (!isClosing.current) {
            close();
        }
    }, [close]);

    useAndroidHardwareBackHandler(screen, handleClose);

    useDidMount(() => {
        hapticFeedback();
    });

    useImperativeHandle(ref, () => ({
        close: () => {
            if (sheetRef.current) {
                sheetRef.current.close();
            } else if (!isClosing.current) {
                close();
            }
        },
    }), [close]);

    const renderBackdrop = useCallback((props: BottomSheetBackdropProps) => {
        return (
            <BottomSheetBackdrop
                {...props}
                disappearsOnIndex={0}
                appearsOnIndex={1}
                opacity={0.6}
            />
        );
    }, []);

    const renderContainerContent = () => (
        <View
            style={[styles.content, contentStyle]}
            testID={`${testID}.screen`}
        >
            {renderContent()}
        </View>
    );

    return (
        <BottomSheetM
            ref={sheetRef}
            index={initialSnapIndex}
            snapPoints={snapPoints}
            animateOnMount={true}
            backdropComponent={renderBackdrop}
            onChange={handleChange}
            animationConfigs={animationConfigs}
            handleIndicatorStyle={styles.indicator}
            handleStyle={styles.indicatorContainer}
            backgroundStyle={styles.bottomSheetBackground}
            footerComponent={footerComponent || EmptyBottomSheetFooter}
            keyboardBehavior={keyboardBehavior}
            keyboardBlurBehavior={keyboardBlurBehavior}
            onClose={onBottomSheetClose}
            bottomInset={footerComponent ? 0 : insets.bottom}
            enableDynamicSizing={enableDynamicSizing}
        >
            <View style={[screenStyle, styles.bottomSheet]}>
                {renderContainerContent()}
            </View>
        </BottomSheetM>
    );
});

BottomSheet.displayName = 'BottomSheet';

export default BottomSheet;
