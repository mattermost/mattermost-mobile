// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import BottomSheetM, {BottomSheetBackdrop, type BottomSheetBackdropProps} from '@gorhom/bottom-sheet';
import React, {type ReactNode, useCallback, useEffect, useMemo, useRef} from 'react';
import {DeviceEventEmitter, type Handle, InteractionManager, Keyboard, type StyleProp, View, type ViewStyle} from 'react-native';

import {Events} from '@constants';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {useIsTablet} from '@hooks/device';
import useNavButtonPressed from '@hooks/navigation_button_pressed';
import {dismissModal} from '@screens/navigation';
import {hapticFeedback} from '@utils/general';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import Indicator from './indicator';

import type {AvailableScreens} from '@typings/screens/navigation';
import type {WithSpringConfig} from 'react-native-reanimated';

export {default as BottomSheetButton, BUTTON_HEIGHT} from './button';
export {default as BottomSheetContent, TITLE_HEIGHT} from './content';

type Props = {
    closeButtonId?: string;
    componentId: AvailableScreens;
    contentStyle?: StyleProp<ViewStyle>;
    initialSnapIndex?: number;
    footerComponent?: React.FC<unknown>;
    renderContent: () => ReactNode;
    snapPoints?: Array<string | number>;
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
}: Props) => {
    const sheetRef = useRef<BottomSheetM>(null);
    const isTablet = useIsTablet();
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const interaction = useRef<Handle>();
    const timeoutRef = useRef<NodeJS.Timeout>();

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
            <>
                <View style={styles.separator}/>
                {renderContainerContent()}
                {FooterComponent && (<FooterComponent/>)}
            </>
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
            animationConfigs={animatedConfig}
            handleComponent={Indicator}
            style={styles.bottomSheet}
            backgroundStyle={bottomSheetBackgroundStyle}
            footerComponent={footerComponent}
            keyboardBehavior='extend'
            keyboardBlurBehavior='restore'
            onClose={close}
        >
            {renderContainerContent()}
        </BottomSheetM>
    );
};

export default BottomSheet;
