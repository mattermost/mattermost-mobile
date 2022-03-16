// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {useWindowDimensions} from 'react-native';
import {Navigation} from 'react-native-navigation';
import {useAnimatedStyle, withTiming} from 'react-native-reanimated';

import Toast from '@components/toast';
import {BOTTOM_TAB_HEIGHT, TABLET_SIDEBAR_WIDTH} from '@constants/view';
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
    const {width} = useWindowDimensions();
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

    const toastStyle = useMemo(() => {
        return [
            {backgroundColor: theme[config.backgroundColor]},
            isTablet && {
                width: 0.96 * (width - TABLET_SIDEBAR_WIDTH),
                marginLeft: TABLET_SIDEBAR_WIDTH,
                marginBottom: 65,
            },
        ];
    }, [theme, barType]);

    return (
        <Toast
            animatedStyle={animatedStyle}
            style={toastStyle}
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
