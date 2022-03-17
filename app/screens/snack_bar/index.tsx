// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {useIntl} from 'react-intl';
import {useWindowDimensions} from 'react-native';
import {useAnimatedStyle, withTiming} from 'react-native-reanimated';

import Toast from '@components/toast';
import {Screens, View} from '@constants';
import {SNACK_BAR_CONFIG, SNACK_BAR_TYPE} from '@constants/snack_bar';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {dismissOverlay} from '@screens/navigation';
import {makeStyleSheetFromTheme} from '@utils/theme';

import Undo from './undo';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        text: {
            color: theme.centerChannelBg,
        },
    };
});

const {BOTTOM_TAB_HEIGHT, TABLET_SIDEBAR_WIDTH} = View;

type SnackBarProps = {
    componentId: string;
    onPress?: () => void;
    barType: keyof typeof SNACK_BAR_TYPE;
    location: typeof Screens[keyof typeof Screens];
    postInputTop: number;
}
const SnackBar = ({barType, componentId, onPress, location, postInputTop}: SnackBarProps) => {
    const intl = useIntl();
    const theme = useTheme();
    const isTablet = useIsTablet();
    const [showToast, setShowToast] = useState<boolean | undefined>();
    const {width: windowWidth, height: windowHeight} = useWindowDimensions();

    const isLandscape = windowWidth > windowHeight;
    const config = SNACK_BAR_CONFIG[barType];
    const styles = getStyleSheet(theme);

    const onPressHandler = useCallback(() => {
        dismissOverlay(componentId);
        onPress?.();
    }, [onPress, componentId]);

    const animatedStyle = useAnimatedStyle(() => ({
        position: 'absolute',
        bottom: BOTTOM_TAB_HEIGHT + 50,
        opacity: withTiming(showToast ? 1 : 0, {duration: 300}),
    }));

    const toastStyle = useMemo(() => {
        const diffWidth = windowWidth - TABLET_SIDEBAR_WIDTH;
        const ratio = isLandscape ? 0.62 : 0.96;
        let tabletStyle = {
            width: 0.96 * diffWidth,
            marginLeft: TABLET_SIDEBAR_WIDTH,
            marginBottom: 65,
        };

        if (location === Screens.THREAD) {
            tabletStyle = {
                marginLeft: 0,
                marginBottom: (windowHeight - postInputTop) / 2,
                width: ratio * diffWidth,
            };
        } else if ([Screens.PERMALINK, Screens.MENTIONS].includes(location)) {
            tabletStyle = {
                marginLeft: 0,
                marginBottom: 0,
                width: 0.96 * windowWidth,
            };
        }

        return [
            {backgroundColor: theme[config.themeColor]},
            isTablet && tabletStyle,
        ];
    }, [theme, barType]);

    useEffect(() => {
        setShowToast(true);
        const t = setTimeout(() => {
            setShowToast(false);
        }, 3000);

        return () => clearTimeout(t);
    }, []);

    useEffect(() => {
        let t: NodeJS.Timeout;
        if (showToast === false) {
            t = setTimeout(() => {
                dismissOverlay(componentId);
            }, 350);
        }

        return () => {
            if (t) {
                clearTimeout(t);
            }
        };
    }, [showToast]);

    return (
        <Toast
            animatedStyle={animatedStyle}
            style={toastStyle}
            message={intl.formatMessage({id: config.id, defaultMessage: config.defaultMessage})}
            iconName={config.iconName}
            textStyle={styles.text}
        >
            {config.canUndo && onPress && (<Undo onPress={onPressHandler}/>)}
        </Toast>
    );
};

export default SnackBar;
