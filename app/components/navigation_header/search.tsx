// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo} from 'react';
import {DeviceEventEmitter, Keyboard, Platform} from 'react-native';
import Animated, {useAnimatedStyle} from 'react-native-reanimated';

import Search, {SearchProps} from '@components/search';
import {Events} from '@constants';
import {HEADER_SEARCH_HEIGHT} from '@constants/view';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type Props = SearchProps & {
    defaultHeight: number;
    largeHeight: number;
    scrollValue?: Animated.SharedValue<number>;
    hideHeader?: () => void;
    theme: Theme;
    top: number;
}

const INITIAL_TOP = -45;

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        backgroundColor: theme.sidebarBg,
        height: HEADER_SEARCH_HEIGHT,
        justifyContent: 'center',
        paddingHorizontal: 20,
        width: '100%',
        zIndex: 10,
        top: INITIAL_TOP,
    },
    inputContainerStyle: {
        backgroundColor: changeOpacity(theme.sidebarText, 0.12),
    },
    inputStyle: {
        color: theme.sidebarText,
    },
}));

const NavigationSearch = ({
    defaultHeight,
    largeHeight,
    scrollValue,
    hideHeader,
    theme,
    ...searchProps
}: Props) => {
    const styles = getStyleSheet(theme);

    const cancelButtonProps: SearchProps['cancelButtonProps'] = useMemo(() => ({
        buttonTextStyle: {
            color: changeOpacity(theme.sidebarText, 0.72),
            ...typography('Body', 100, 'Regular'),
        },
        color: theme.sidebarText,
    }), [theme]);

    const searchTop = useAnimatedStyle(() => {
        const value = scrollValue?.value || 0;
        const min = (largeHeight - defaultHeight);
        return {marginTop: Math.min(-Math.min((value), min), min)};
    }, [largeHeight, defaultHeight]);

    const onFocus = useCallback((e) => {
        hideHeader?.();
        searchProps.onFocus?.(e);
    }, [hideHeader, searchProps.onFocus]);

    useEffect(() => {
        const show = Keyboard.addListener('keyboardDidShow', () => {
            if (Platform.OS === 'android') {
                DeviceEventEmitter.emit(Events.TAB_BAR_VISIBLE, false);
            }
        });

        const hide = Keyboard.addListener('keyboardDidHide', () => {
            if (Platform.OS === 'android') {
                DeviceEventEmitter.emit(Events.TAB_BAR_VISIBLE, true);
            }
        });

        return () => {
            hide.remove();
            show.remove();
        };
    }, []);

    return (
        <Animated.View style={[styles.container, searchTop]}>
            <Search
                {...searchProps}
                cancelButtonProps={cancelButtonProps}
                clearIconColor={theme.sidebarText}
                inputContainerStyle={styles.inputContainerStyle}
                inputStyle={styles.inputStyle}
                onFocus={onFocus}
                placeholderTextColor={changeOpacity(theme.sidebarText, Platform.select({android: 0.56, default: 0.72}))}
                searchIconColor={theme.sidebarText}
                selectionColor={theme.sidebarText}
            />
        </Animated.View>
    );
};

export default NavigationSearch;

