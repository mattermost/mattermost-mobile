// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {ReactNode, useEffect, useRef} from 'react';
import {BackHandler, DeviceEventEmitter, StyleSheet, useWindowDimensions, View} from 'react-native';
import {State, TapGestureHandler} from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import RNBottomSheet from 'reanimated-bottom-sheet';

import {Navigation} from '@constants';
import {useTheme} from '@context/theme';
import {dismissModal} from '@screens/navigation';
import {hapticFeedback} from '@utils/general';

import Indicator from './indicator';

type SlideUpPanelProps = {
    initialSnapIndex?: number;
    renderContent: () => ReactNode;
    snapPoints?: Array<string | number>;
}

const BottomSheet = ({initialSnapIndex = 0, renderContent, snapPoints = ['90%', '50%', 50]}: SlideUpPanelProps) => {
    const sheetRef = useRef<RNBottomSheet>(null);
    const dimensions = useWindowDimensions();
    const theme = useTheme();
    const lastSnap = snapPoints.length - 1;

    useEffect(() => {
        const listener = DeviceEventEmitter.addListener(Navigation.NAVIGATION_CLOSE_MODAL, () => sheetRef.current?.snapTo(lastSnap));

        return () => listener.remove();
    }, []);

    useEffect(() => {
        const listener = BackHandler.addEventListener('hardwareBackPress', () => {
            sheetRef.current?.snapTo(1);
            return true;
        });

        return () => listener.remove();
    }, []);

    useEffect(() => {
        hapticFeedback();
        sheetRef.current?.snapTo(initialSnapIndex);
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

    const renderContainer = () => (
        <View
            style={{
                backgroundColor: theme.centerChannelBg,
                opacity: 1,
                padding: 16,
                height: '100%',
                width: Math.min(dimensions.width, 450),
                alignSelf: 'center',
            }}
        >
            {renderContent()}
        </View>
    );

    return (
        <>
            <RNBottomSheet
                ref={sheetRef}
                snapPoints={snapPoints}
                borderRadius={10}
                initialSnap={initialSnapIndex}
                renderContent={renderContainer}
                onCloseEnd={() => dismissModal()}
                enabledBottomInitialAnimation={true}
                renderHeader={Indicator}
                enabledContentTapInteraction={false}
            />
            {renderBackdrop()}
        </>
    );
};

export default BottomSheet;
