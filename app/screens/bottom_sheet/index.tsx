// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {ReactNode, useEffect, useRef} from 'react';
import {BackHandler, DeviceEventEmitter, Keyboard, StyleSheet, useWindowDimensions, View} from 'react-native';
import {State, TapGestureHandler} from 'react-native-gesture-handler';
import {Navigation as RNN} from 'react-native-navigation';
import Animated from 'react-native-reanimated';
import RNBottomSheet from 'reanimated-bottom-sheet';

import {Navigation} from '@constants';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {dismissModal} from '@screens/navigation';
import {hapticFeedback} from '@utils/general';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import Indicator from './indicator';

type SlideUpPanelProps = {
    closeButtonId?: string;
    initialSnapIndex?: number;
    renderContent: () => ReactNode;
    snapPoints?: Array<string | number>;
}

const BottomSheet = ({closeButtonId, initialSnapIndex = 0, renderContent, snapPoints = ['90%', '50%', 50]}: SlideUpPanelProps) => {
    const sheetRef = useRef<RNBottomSheet>(null);
    const dimensions = useWindowDimensions();
    const isTablet = useIsTablet();
    const theme = useTheme();
    const lastSnap = snapPoints.length - 1;

    useEffect(() => {
        const listener = DeviceEventEmitter.addListener(Navigation.NAVIGATION_CLOSE_MODAL, () => {
            if (sheetRef.current) {
                sheetRef.current.snapTo(lastSnap);
            } else {
                dismissModal();
            }
        });

        return () => listener.remove();
    }, []);

    useEffect(() => {
        const listener = BackHandler.addEventListener('hardwareBackPress', () => {
            if (sheetRef.current) {
                sheetRef.current.snapTo(1);
            } else {
                dismissModal();
            }
            return true;
        });

        return () => listener.remove();
    }, []);

    useEffect(() => {
        hapticFeedback();
        Keyboard.dismiss();
        sheetRef.current?.snapTo(initialSnapIndex);
    }, []);

    useEffect(() => {
        const navigationEvents = RNN.events().registerNavigationButtonPressedListener(({buttonId}) => {
            if (closeButtonId && buttonId === closeButtonId) {
                dismissModal();
            }
        });

        return () => navigationEvents.remove();
    }, []);

    const renderBackdrop = () => {
        return (
            <TapGestureHandler
                shouldCancelWhenOutside={true}
                maxDist={10}
                onHandlerStateChange={(event) => {
                    if (event.nativeEvent.state === State.END && event.nativeEvent.oldState === State.ACTIVE) {
                        sheetRef.current?.snapTo(lastSnap);
                    }
                }}
            >
                <Animated.View
                    style={{...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 0, 0, 0.5)'}}
                />
            </TapGestureHandler>
        );
    };

    const renderContainerContent = () => (
        <View
            style={{
                backgroundColor: theme.centerChannelBg,
                opacity: 1,
                paddingHorizontal: 20,
                paddingTop: isTablet ? 0 : 20,
                height: '100%',
                width: isTablet ? '100%' : Math.min(dimensions.width, 450),
                alignSelf: 'center',
            }}
        >
            {renderContent()}
        </View>
    );

    if (isTablet) {
        const styles = getStyleSheet(theme);
        return (
            <>
                <View style={styles.separator}/>
                {renderContainerContent()}
            </>
        );
    }

    return (
        <>
            <RNBottomSheet
                ref={sheetRef}
                snapPoints={snapPoints}
                borderRadius={10}
                initialSnap={initialSnapIndex}
                renderContent={renderContainerContent}
                onCloseEnd={() => dismissModal()}
                enabledBottomInitialAnimation={true}
                renderHeader={Indicator}
                enabledContentTapInteraction={false}
            />
            {renderBackdrop()}
        </>
    );
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        separator: {
            height: 1,
            borderTopWidth: 1,
            borderColor: changeOpacity(theme.centerChannelColor, 0.08),
        },
    };
});

export default BottomSheet;
