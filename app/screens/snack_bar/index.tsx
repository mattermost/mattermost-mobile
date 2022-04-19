// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useState} from 'react';
import {useIntl} from 'react-intl';
import {Text, TouchableOpacity} from 'react-native';
import {useAnimatedStyle, withTiming} from 'react-native-reanimated';

import Toast from '@components/toast';
import {Screens} from '@constants';
import {SNACK_BAR_CONFIG, SNACK_BAR_TYPE} from '@constants/snack_bar';
import {BOTTOM_TAB_HEIGHT} from '@constants/view';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {dismissOverlay} from '@screens/navigation';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        text: {
            color: theme.centerChannelBg,
        },
        undo: {
            color: theme.centerChannelBg,
            ...typography('Body', 100, 'SemiBold'),
        },
    };
});

type SnackBarProps = {
    componentId: string;
    onPress?: () => void;
    barType: keyof typeof SNACK_BAR_TYPE;
    location: typeof Screens[keyof typeof Screens];
}

const SnackBar = ({barType, componentId, onPress, location}: SnackBarProps) => {
    const [showToast, setShowToast] = useState<boolean | undefined>();
    const intl = useIntl();
    const theme = useTheme();
    const isTablet = useIsTablet();

    const config = SNACK_BAR_CONFIG[barType];
    const styles = getStyleSheet(theme);

    const onPressHandler = useCallback(() => {
        dismissOverlay(componentId);
        onPress?.();
    }, [onPress, componentId]);

    const animatedStyle = useAnimatedStyle(() => {
        let diff = 50;
        const screens = [Screens.PERMALINK, Screens.MENTIONS, Screens.SAVED_POSTS];
        if (!isTablet && screens.includes(location)) {
            diff = 7;
        }

        return {
            position: 'absolute',
            bottom: BOTTOM_TAB_HEIGHT + diff,
            opacity: withTiming(showToast ? 1 : 0, {duration: 300}),
        };
    });

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
            style={{}}
            message={intl.formatMessage({id: config.id, defaultMessage: config.defaultMessage})}
            iconName={config.iconName}
            textStyle={styles.text}
        >
            {config.canUndo && onPress && (
                <TouchableOpacity onPress={onPressHandler}>
                    <Text
                        style={styles.undo}
                    >
                        {intl.formatMessage({
                            id: 'snack.bar.undo',
                            defaultMessage: 'Undo',
                        })}
                    </Text>
                </TouchableOpacity>)}
        </Toast>
    );
};

export default SnackBar;
