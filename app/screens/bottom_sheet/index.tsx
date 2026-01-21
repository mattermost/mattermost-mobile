// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import BottomSheetM, {BottomSheetBackdrop, BottomSheetScrollView, BottomSheetView, type BottomSheetBackdropProps} from '@gorhom/bottom-sheet';
import React, {type ReactNode, useCallback, useEffect, useMemo, useRef} from 'react';
import {DeviceEventEmitter, type Handle, InteractionManager, Keyboard, type StyleProp, View, type ViewStyle} from 'react-native';
import {ReduceMotion, useReducedMotion, type WithSpringConfig} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {Events} from '@constants';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {useBottomSheetListsFix} from '@hooks/bottom_sheet_lists_fix';
import {navigateBack} from '@screens/navigation';
import BottomSheetStore from '@store/bottom_sheet_store';
import {hapticFeedback} from '@utils/general';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import EmptyBottomSheetFooter from './footer';
import {useBottomSheetStyle} from './hooks';

import type {AvailableScreens} from '@typings/screens/navigation';

export {default as BottomSheetButton, BUTTON_HEIGHT} from './button';
export {default as BottomSheetContent, TITLE_HEIGHT} from './content';

type Props = {
    screen: AvailableScreens;
    contentStyle?: StyleProp<ViewStyle>;
    initialSnapIndex?: number;
    footerComponent?: React.FC<unknown>;
    renderContent: () => ReactNode;
    snapPoints?: Array<string | number>;
    enableDynamicSizing?: boolean;
    testID?: string;
    scrollable?: boolean;
}

const PADDING_TOP_MOBILE = 20;

export const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        bottomSheet: {
            backgroundColor: theme.centerChannelBg,
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
            flex: 1,
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
    restSpeedThreshold: 0.3,
    restDisplacementThreshold: 0.3,
};

const BottomSheet = ({
    screen,
    contentStyle,
    initialSnapIndex = 1,
    footerComponent,
    renderContent,
    snapPoints = [1, '50%', '80%'],
    testID,
    enableDynamicSizing = false,
    scrollable = false,
}: Props) => {
    const isClosing = useRef(false);
    const reducedMotion = useReducedMotion();
    const sheetRef = useRef<BottomSheetM>(null);
    const insets = useSafeAreaInsets();
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const interaction = useRef<Handle>();
    const timeoutRef = useRef<NodeJS.Timeout>();

    const {enabled, panResponder} = useBottomSheetListsFix();
    const screenStyle = useBottomSheetStyle();

    const animationConfigs = useMemo(() => ({
        ...animatedConfig,
        reduceMotion: reducedMotion ? ReduceMotion.Always : ReduceMotion.Never,
    }), [reducedMotion]);

    useEffect(() => {
        interaction.current = InteractionManager.createInteractionHandle();
    }, []);

    const close = useCallback(() => {
        isClosing.current = true;
        BottomSheetStore.reset();
        navigateBack();
    }, []);

    useEffect(() => {
        const listener = DeviceEventEmitter.addListener(Events.CLOSE_BOTTOM_SHEET, () => {
            if (sheetRef.current) {
                sheetRef.current.close();
            } else if (!isClosing.current) {
                close();
            }
        });

        return () => listener.remove();
    }, [close]);

    const handleAnimationStart = useCallback(() => {
        if (!interaction.current) {
            interaction.current = InteractionManager.createInteractionHandle();
        }
    }, []);

    const handleClose = useCallback(() => {
        if (sheetRef.current) {
            sheetRef.current.close();
        } else if (!isClosing.current) {
            close();
        }
    }, [close]);

    const handleChange = useCallback((index: number) => {
        timeoutRef.current = setTimeout(() => {
            if (interaction.current) {
                InteractionManager.clearInteractionHandle(interaction.current);
                interaction.current = undefined;
            }
        });

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

    useEffect(() => {
        hapticFeedback();
        Keyboard.dismiss();

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }

            if (interaction.current) {
                InteractionManager.clearInteractionHandle(interaction.current);
            }
        };
    }, []);

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

    const scrollViewProps = {
        style: styles.view,
        showsVerticalScrollIndicator: false,
        scrollEnabled: enabled,
        ...panResponder.panHandlers,
    };

    let content;
    if (scrollable) {
        content = (
            <BottomSheetScrollView {...scrollViewProps}>
                {renderContainerContent()}
            </BottomSheetScrollView>
        );
    } else {
        content = (
            <BottomSheetView style={styles.view}>
                {renderContainerContent()}
            </BottomSheetView>
        );
    }

    return (
        <BottomSheetM
            ref={sheetRef}
            index={initialSnapIndex}
            snapPoints={snapPoints}
            animateOnMount={true}
            backdropComponent={renderBackdrop}
            onAnimate={handleAnimationStart}
            onChange={handleChange}
            animationConfigs={animationConfigs}
            handleIndicatorStyle={styles.indicator}
            handleStyle={styles.indicatorContainer}
            backgroundStyle={styles.bottomSheetBackground}
            footerComponent={footerComponent || EmptyBottomSheetFooter}
            keyboardBehavior='extend'
            keyboardBlurBehavior='restore'
            onClose={onBottomSheetClose}
            bottomInset={insets.bottom}
            enableDynamicSizing={enableDynamicSizing}
        >
            <View style={[styles.bottomSheet, screenStyle]}>
                {content}
            </View>
        </BottomSheetM>
    );
};

export default BottomSheet;
