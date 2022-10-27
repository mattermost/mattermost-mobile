// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo} from 'react';
import {DeviceEventEmitter, Keyboard, NativeSyntheticEvent, Platform, TextInputFocusEventData, ViewStyle} from 'react-native';
import Animated, {AnimatedStyleProp} from 'react-native-reanimated';

import Search, {SearchProps} from '@components/search';
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

const NavigationSearch = ({
    hideHeader,
    theme,
    topStyle,
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

    const onFocus = useCallback((e: NativeSyntheticEvent<TextInputFocusEventData>) => {
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
            />
        </Animated.View>
    );
};

export default NavigationSearch;

