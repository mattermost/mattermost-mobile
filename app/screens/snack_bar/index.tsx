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
import {SNACK_BAR_CONFIG, SNACK_BAR_TYPE} from '@screens/snack_bar/constants';

type SnackBarProps = {
    componentId: string;
    isDismissible: boolean;
    style: StyleProp<ViewProps>;
    onPress?: () => void;
    barType: keyof typeof SNACK_BAR_TYPE; // connection lost, reconnected, etc..
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
    barType,
    componentId,
    isDismissible = true,
    onPress,
}: SnackBarProps) => {
    const intl = useIntl();
    const [showToast, setShowToast] = useState<boolean|undefined>(true);

    const config = SNACK_BAR_CONFIG[barType];

    useEffect(() => {
        if (showToast && isDismissible) {
            const t = setTimeout(() => {
                setShowToast(false);
                Navigation.dismissOverlay(componentId);
                clearTimeout(t);
            }, 3000);
        }
    }, [showToast]);

    const onPressHandler = useCallback(() => {
        Navigation.dismissOverlay(componentId);
        onPress?.();
    }, [onPress, componentId]);

    const animatedStyle = useAnimatedStyle(() => ({
        position: 'absolute',
        bottom: BOTTOM_TAB_HEIGHT + 50,
        opacity: withTiming(showToast ? 1 : 0, {duration: 300}),
    }));

    return (
        <Toast
            animatedStyle={animatedStyle}
            style={styles.toast}
            message={intl.formatMessage({id: config.id, defaultMessage: config.defaultMessage})}
            iconName={config.iconName}
        >
            {
                config.canUndo && onPress && (
                    <TouchableOpacity
                        onPress={onPressHandler}
                    >
                        <Text>{intl.formatMessage({id: 'snack.bar.undo', defaultMessage: 'Undo'})}</Text>
                    </TouchableOpacity>
                )
            }
        </Toast>
    );
};

export default SnackBar;
