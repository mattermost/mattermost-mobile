// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {forwardRef, useCallback, useEffect, useMemo} from 'react';
import {DeviceEventEmitter, Keyboard, type NativeSyntheticEvent, Platform, type TextInputFocusEventData, type ViewStyle} from 'react-native';
import Animated, {type AnimatedStyleProp} from 'react-native-reanimated';

import Search, {type SearchProps, type SearchRef} from '@components/search';
import {Events} from '@constants';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type Props = SearchProps & {
    topStyle: AnimatedStyleProp<ViewStyle>;
    hideHeader?: () => void;
    theme: Theme;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        backgroundColor: theme.sidebarBg,
        paddingHorizontal: 20,
        width: '100%',
        zIndex: 10,
    },
    inputContainerStyle: {
        backgroundColor: changeOpacity(theme.sidebarText, 0.12),
    },
    inputStyle: {
        color: theme.sidebarText,
    },
}));

const NavigationSearch = forwardRef<SearchRef, Props>(({
    hideHeader,
    theme,
    topStyle,
    ...searchProps
}: Props, ref) => {
    const styles = getStyleSheet(theme);

    const cancelButtonProps: SearchProps['cancelButtonProps'] = useMemo(() => ({
        buttonTextStyle: {
            color: changeOpacity(theme.sidebarText, 0.72),
            ...typography('Body', 100, 'Regular'),
        },
        color: theme.sidebarText,
    }), [theme]);

    const onFocus = useCallback((e: NativeSyntheticEvent<TextInputFocusEventData>) => {
        hideHeader?.();
        searchProps.onFocus?.(e);
    }, [hideHeader, searchProps.onFocus]);

    const showEmitter = useCallback(() => {
        if (Platform.OS === 'android') {
            DeviceEventEmitter.emit(Events.TAB_BAR_VISIBLE, false);
        }
    }, []);

    const hideEmitter = useCallback(() => {
        if (Platform.OS === 'android') {
            DeviceEventEmitter.emit(Events.TAB_BAR_VISIBLE, true);
        }
    }, []);

    useEffect(() => {
        const show = Keyboard.addListener('keyboardDidShow', showEmitter);
        const hide = Keyboard.addListener('keyboardDidHide', hideEmitter);

        return () => {
            hide.remove();
            show.remove();
        };
    }, [hideEmitter, showEmitter]);

    return (
        <Animated.View style={[styles.container, topStyle]}>
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
                ref={ref}
                testID='navigation.header.search_bar'
            />
        </Animated.View>
    );
});

NavigationSearch.displayName = 'NavSearch';
export default NavigationSearch;

