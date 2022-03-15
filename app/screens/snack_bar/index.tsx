// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useState} from 'react';
import {useIntl} from 'react-intl';
import {Text, StyleProp, StyleSheet, ViewProps} from 'react-native';
import {TouchableOpacity} from 'react-native-gesture-handler';
import {Navigation} from 'react-native-navigation';
import {useAnimatedStyle, withTiming} from 'react-native-reanimated';

import Toast from '@components/toast';
import {BOTTOM_TAB_HEIGHT} from '@constants/view';

type SnackBarProps = {
    iconName: string;
    componentId: string;
    isDismissible: boolean;
    message: string;
    style: StyleProp<ViewProps>;
    onPress: () => void;
    barType: string; // connection lost, reconnected, etc..
}

//todo: add method to dismiss the overlay  => Navigation.dismissOverlay(componentId)

//todo: think of how to prevent the overlay from being dismissed => e.g. prevent it from being dismissed if no connection,
// but if you get connection, then remove the toast....add connection listener?

const styles = StyleSheet.create({
    error: {
        backgroundColor: '#D24B4E',
    },
    toast: {
        backgroundColor: '#3DB887', // intended hardcoded color
    },
});

const SnackBar = ({
    iconName,
    message,
    style,
    componentId,
    barType,
    isDismissible = false,
    onPress,
}: SnackBarProps) => {
    const intl = useIntl();
    const [showToast, setShowToast] = useState<boolean|undefined>(true);

    useEffect(() => {
        if (showToast && isDismissible) {
            setTimeout(() => {
                setShowToast(false);
                Navigation.dismissOverlay(componentId);
            }, 3000);
        }
    }, [showToast]);

    const onPressHandler = useCallback(() => {
        Navigation.dismissOverlay(componentId);
    }, [onPress, componentId]);

    const animatedStyle = useAnimatedStyle(() => ({
        position: 'absolute',
        bottom: BOTTOM_TAB_HEIGHT + 50,
        opacity: withTiming(showToast ? 1 : 0, {duration: 300}),
    }));

    return (
        <Toast
            animatedStyle={animatedStyle}
            style={[styles.toast, style]}
            message={message}
            iconName={iconName}
        >
            {
                Boolean(onPress) && (
                    <TouchableOpacity
                        onPress={onPressHandler}
                        style={{
                            alignItems: 'flex-end',
                            justifyContent: 'center',
                            flex: 1,
                            marginTop: 8,
                        }}
                    >
                        <Text>{intl.formatMessage({id: 'snack.bar.undo', defaultMessage: 'Undo'})}</Text>
                    </TouchableOpacity>
                )
            }
        </Toast>
    );
};

export default SnackBar;
