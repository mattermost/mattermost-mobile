// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import Animated, {useAnimatedStyle} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {useTheme} from '@context/theme';
import useHeaderHeight, {MAX_OVERSCROLL} from '@hooks/header';
import {makeStyleSheetFromTheme} from '@utils/theme';

import Header, {HeaderRightButton} from './header';
import NavigationHeaderLargeTitle from './large';
import NavigationSearch from './search';

import type {SearchProps} from '@components/search';

type Props = SearchProps & {
    hasSearch?: boolean;
    isLargeTitle?: boolean;
    leftComponent?: React.ReactElement;
    onBackPress?: () => void;
    onTitlePress?: () => void;
    rightButtons?: HeaderRightButton[];
    scrollValue?: Animated.SharedValue<number>;
    lockValue?: Animated.SharedValue<number | null>;
    hideHeader?: () => void;
    showBackButton?: boolean;
    subtitle?: string;
    subtitleCompanion?: React.ReactElement;
    title?: string;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        backgroundColor: theme.sidebarBg,
        position: 'absolute',
        width: '100%',
        zIndex: 10,
    },
}));

const NavigationHeader = ({
    hasSearch = false,
    isLargeTitle = false,
    leftComponent,
    onBackPress,
    onTitlePress,
    rightButtons,
    scrollValue,
    lockValue,
    showBackButton,
    subtitle,
    subtitleCompanion,
    title = '',
    hideHeader,
    ...searchProps
}: Props) => {
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const styles = getStyleSheet(theme);

    const {largeHeight, defaultHeight} = useHeaderHeight();
    const containerHeight = useAnimatedStyle(() => {
        const minHeight = defaultHeight + insets.top;
        const value = -(scrollValue?.value || 0);
        const calculatedHeight = (isLargeTitle ? largeHeight : defaultHeight) + value;
        const height = lockValue?.value ? lockValue.value : calculatedHeight;
        const maxHeight = largeHeight + insets.top + MAX_OVERSCROLL;
        return {
            height: Math.max(height, minHeight),
            minHeight,
            maxHeight,
        };
    });

    return (
        <>
            <Animated.View style={[styles.container, containerHeight]}>
                <Header
                    defaultHeight={defaultHeight}
                    hasSearch={hasSearch}
                    isLargeTitle={isLargeTitle}
                    largeHeight={largeHeight}
                    leftComponent={leftComponent}
                    onBackPress={onBackPress}
                    onTitlePress={onTitlePress}
                    rightButtons={rightButtons}
                    lockValue={lockValue}
                    scrollValue={scrollValue}
                    showBackButton={showBackButton}
                    subtitle={subtitle}
                    subtitleCompanion={subtitleCompanion}
                    theme={theme}
                    title={title}
                    top={insets.top}
                />
                {isLargeTitle &&
                <NavigationHeaderLargeTitle
                    defaultHeight={defaultHeight}
                    hasSearch={hasSearch}
                    largeHeight={largeHeight}
                    lockValue={lockValue}
                    scrollValue={scrollValue}
                    subtitle={subtitle}
                    theme={theme}
                    title={title}
                />
                }
                {hasSearch &&
                    <NavigationSearch
                        {...searchProps}
                        defaultHeight={defaultHeight}
                        largeHeight={largeHeight}
                        lockValue={lockValue}
                        scrollValue={scrollValue}
                        hideHeader={hideHeader}
                        theme={theme}
                        top={0}
                    />
                }
            </Animated.View>
        </>
    );
};

export default NavigationHeader;

