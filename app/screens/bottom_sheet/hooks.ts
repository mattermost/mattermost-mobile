// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useEffect, useState} from 'react';
import {StyleSheet, type StyleProp, type ViewStyle} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';

export function useBottomSheetStyle() {
    const theme = useTheme();
    const isTablet = useIsTablet();
    const [style, setStyle] = useState<StyleProp<ViewStyle>>(() => ({
        width: isTablet ? '60%' : '100%',
        alignSelf: 'center',
        backgroundColor: theme.centerChannelBg,
    }));

    useEffect(() => {
        setStyle({
            width: isTablet ? '60%' : '100%',
            alignSelf: 'center',
            backgroundColor: theme.centerChannelBg,
        });
    }, [isTablet, theme.centerChannelBg]);

    return style;
}

export function useBottomSheetFooterStyles() {
    const bStyle = useBottomSheetStyle();
    const {bottom} = useSafeAreaInsets();
    const [style, setStyle] = useState<StyleProp<ViewStyle>>(() => StyleSheet.flatten([bStyle, {
        top: bottom,
        height: bottom,
    }]));

    useEffect(() => {
        setStyle(
            StyleSheet.flatten([bStyle, {
                top: bottom,
                height: bottom,
            }]));
    }, [bStyle, bottom]);

    return style;
}
