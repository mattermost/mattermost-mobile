// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect, useRef} from 'react';
import {Animated, DeviceEventEmitter, Platform, StyleSheet, TouchableWithoutFeedback, useWindowDimensions, View} from 'react-native';

import {Navigation} from '@constants';
import {dismissModal} from '@screens/navigation';

import OptionsModalList from './components/options_modal_list';

const DURATION = 200;

type OptionModalProps = {
    items: [];
    onCancelPress?: () => void;
    title: string | any;
}

const OptionModal = ({onCancelPress, items, title}: OptionModalProps) => {
    const dimension = useWindowDimensions();
    const deviceHeight = dimension.height;
    const deviceWidth = dimension.width;

    const top = useRef(new Animated.Value(deviceHeight));

    useEffect(() => {
        DeviceEventEmitter.addListener(Navigation.NAVIGATION_CLOSE_MODAL, close);

        return () => {
            return DeviceEventEmitter.removeAllListeners();
        };
    }, []);

    useEffect(() => {
        Animated.timing(top.current, {
            toValue: 0,
            duration: DURATION,
            useNativeDriver: false,
        }).start();
    }, []);

    const handleCancel = () => {
        onCancelPress?.();
        close();
    };

    const close = () => {
        Animated.timing(top.current, {
            toValue: deviceHeight,
            duration: DURATION,
            useNativeDriver: false,
        }).start(() => {
            dismissModal();
        });
    };

    const onItemPress = () => {
        if (Platform.OS === 'android') {
            close();
        } else {
            dismissModal();
        }
    };

    return (
        <TouchableWithoutFeedback onPress={handleCancel}>
            <View style={style.wrapper}>
                <Animated.View style={{height: deviceHeight, left: 0, top: top.current, width: deviceWidth}}>
                    <OptionsModalList
                        items={items}
                        onCancelPress={handleCancel}
                        onItemPress={onItemPress}
                        title={title}
                    />
                </Animated.View>
            </View>
        </TouchableWithoutFeedback>
    );
};

const style = StyleSheet.create({
    wrapper: {
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        flex: 1,
    },
});

export default OptionModal;
