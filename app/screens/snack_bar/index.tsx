// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {Navigation} from 'react-native-navigation';
import {useAnimatedStyle, withTiming} from 'react-native-reanimated';

import Toast from '@components/toast';
import {BOTTOM_TAB_HEIGHT} from '@constants/view';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {SNACK_BAR_CONFIG, SNACK_BAR_TYPE} from '@screens/snack_bar/constants';
import useToastToggler from '@screens/snack_bar/useToastToggler';

import Undo from './undo';

type SnackBarProps = {
    componentId: string;
    isDismissible: boolean;
    onPress?: () => void;
    barType: keyof typeof SNACK_BAR_TYPE; // connection lost, reconnected, etc..
}

//todo: think of how to prevent the overlay from being dismissed => e.g. prevent it from being dismissed if no connection,
// but if you get connection, then remove the toast....add connection listener?

const SnackBar = ({
    barType,
    componentId,
    isDismissible = true,
    onPress,
}: SnackBarProps) => {
    const intl = useIntl();
    const theme = useTheme();
    const showToast = useToastToggler(componentId, isDismissible);
    const isTablet = useIsTablet();

    const config = SNACK_BAR_CONFIG[barType];

    const onPressHandler = useCallback(() => {
        Navigation.dismissOverlay(componentId);
        onPress?.();
    }, [onPress, componentId]);

    const animatedStyle = useAnimatedStyle(() => ({
        position: 'absolute',
        bottom: BOTTOM_TAB_HEIGHT + 50,
        opacity: withTiming(showToast ? 1 : 0, {duration: 300}),
    }));

    //fixme: add proper styling for when it is opened on Tablets
    return (
        <Toast
            animatedStyle={animatedStyle}
            style={[
                {backgroundColor: theme[config.backgroundColor]},
                isTablet && {
                    backgroundColor: 'red',
                    width: '100%',
                },
            ]}
            message={intl.formatMessage({id: config.id, defaultMessage: config.defaultMessage})}
            iconName={config.iconName}
        >
            {
                config.canUndo && onPress && (
                    <Undo
                        onPress={onPressHandler}
                        theme={theme}
                        intl={intl}
                    />
                )
            }
        </Toast>
    );
};

export default SnackBar;
