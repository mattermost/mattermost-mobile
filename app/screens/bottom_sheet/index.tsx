// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import BottomSheetM, {BottomSheetBackdrop, BottomSheetView, type BottomSheetBackdropProps} from '@gorhom/bottom-sheet';
import React, {type ReactNode, useCallback, useEffect, useMemo, useRef} from 'react';
import {DeviceEventEmitter, type Handle, InteractionManager, Keyboard, type StyleProp, View, type ViewStyle} from 'react-native';
import {ReduceMotion, useReducedMotion, type WithSpringConfig} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {Events} from '@constants';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {useIsTablet} from '@hooks/device';
import useNavButtonPressed from '@hooks/navigation_button_pressed';
import SecurityManager from '@managers/security_manager';
import {dismissModal} from '@screens/navigation';
import {hapticFeedback} from '@utils/general';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import Indicator from './indicator';

import type {AvailableScreens} from '@typings/screens/navigation';

export {default as BottomSheetButton, BUTTON_HEIGHT} from './button';
export {default as BottomSheetContent, TITLE_HEIGHT} from './content';

export const BOTTOM_SHEET_ANDROID_OFFSET = 12;

type Props = {
    closeButtonId?: string;
    componentId: AvailableScreens;
    contentStyle?: StyleProp<ViewStyle>;
    initialSnapIndex?: number;
    footerComponent?: React.FC<unknown>;
    renderContent: () => ReactNode;
    snapPoints?: Array<string | number>;
    enableDynamicSizing?: boolean;
    testID?: string;
}

const PADDING_TOP_MOBILE = 20;
const PADDING_TOP_TABLET = 8;

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
        },
        bottomSheetBackground: {
            backgroundColor: theme.centerChannelBg,
            borderColor: changeOpacity(theme.centerChannelColor, 0.16),
        },
        content: {
            flex: 1,
            paddingHorizontal: 20,
            paddingTop: PADDING_TOP_MOBILE,
        },
        contentTablet: {
            paddingTop: PADDING_TOP_TABLET,
        },
        separator: {
            height: 1,
            borderTopWidth: 1,
            borderColor: changeOpacity(theme.centerChannelColor, 0.08),
        },
        view: {
            flex: 1,
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
    closeButtonId,
    componentId,
    contentStyle,
    initialSnapIndex = 1,
    footerComponent,
    renderContent,
    snapPoints = [1, '50%', '80%'],
    testID,
    enableDynamicSizing = false,
}: Props) => {
    const reducedMotion = useReducedMotion();
    const sheetRef = useRef<BottomSheetM>(null);
    const isTablet = useIsTablet();
    const insets = useSafeAreaInsets();
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const interaction = useRef<Handle>();
    const timeoutRef = useRef<NodeJS.Timeout>();

    const animationConfigs = useMemo(() => ({
        ...animatedConfig,
        reduceMotion: reducedMotion ? ReduceMotion.Always : ReduceMotion.Never,
    }), [reducedMotion]);

    useEffect(() => {
        interaction.current = InteractionManager.createInteractionHandle();
    }, []);

    const bottomSheetBackgroundStyle = useMemo(() => [
        styles.bottomSheetBackground,
        {borderWidth: isTablet ? 0 : 1},
    ], [isTablet, styles]);

    const close = useCallback(() => {
        dismissModal({componentId});
    }, [componentId]);

    useEffect(() => {
        const listener = DeviceEventEmitter.addListener(Events.CLOSE_BOTTOM_SHEET, () => {
            if (sheetRef.current) {
                sheetRef.current.close();
            } else {
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
        } else {
            close();
        }
    }, []);

    const handleChange = useCallback((index: number) => {
        timeoutRef.current = setTimeout(() => {
            if (interaction.current) {
                InteractionManager.clearInteractionHandle(interaction.current);
                interaction.current = undefined;
            }
        });

        if (index <= 0) {
            close();
        }
    }, []);

    useAndroidHardwareBackHandler(componentId, handleClose);
    useNavButtonPressed(closeButtonId || '', componentId, close, [close]);

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
            style={[styles.content, isTablet && styles.contentTablet, contentStyle]}
            testID={`${testID}.screen`}
        >
            {renderContent()}
        </View>
    );

    if (isTablet) {
        const FooterComponent = footerComponent;
        return (
            <View
                style={styles.view}
                nativeID={SecurityManager.getShieldScreenId(componentId)}
            >
                <View style={styles.separator}/>
                {renderContainerContent()}
                {FooterComponent && (<FooterComponent/>)}
            </View>
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
            handleComponent={Indicator}
            style={styles.bottomSheet}
            backgroundStyle={bottomSheetBackgroundStyle}
            footerComponent={footerComponent}
            keyboardBehavior='extend'
            keyboardBlurBehavior='restore'
            onClose={close}
            bottomInset={insets.bottom}
            enableDynamicSizing={enableDynamicSizing}
        >
            <BottomSheetView style={styles.view}>
                {renderContainerContent()}
            </BottomSheetView>
        </BottomSheetM>
    );
};

export default BottomSheet;
