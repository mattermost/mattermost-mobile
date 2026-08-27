// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {forwardRef} from 'react';
import Animated, {useAnimatedStyle, useDerivedValue, type SharedValue} from 'react-native-reanimated';

import {SEARCH_INPUT_HEIGHT, SEARCH_INPUT_MARGIN} from '@constants/view';
import {useTheme} from '@context/theme';
import useHeaderHeight, {MAX_OVERSCROLL} from '@hooks/header';
import {clamp} from '@utils/gallery';
import {makeStyleSheetFromTheme} from '@utils/theme';

import Header from './header';
import NavigationHeaderLargeTitle from './large';
import NavigationSearch from './search';

import type {NavigationButtonProps} from '@components/navigation_button';
import type {SearchProps, SearchRef} from '@components/search';

type Props = SearchProps & {
    hasSearch?: boolean;
    isLargeTitle?: boolean;
    leftComponent?: React.ReactElement;
    onBackPress?: () => void;
    onTitlePress?: () => void;
    rightButtons?: NavigationButtonProps[];
    scrollValue?: SharedValue<number>;
    lockValue?: number;
    hideHeader?: () => void;
    showBackButton?: boolean;
    subtitle?: string;
    subtitleCompanion?: React.ReactElement;

    // Replaces the subtitle row entirely when provided. The header is a fixed
    // height with no room for a third line, so a caller that needs to show
    // something richer than text on that line displaces the subtitle rather than
    // sitting beside it. Ignored on large-title screens, where the subtitle is
    // rendered by NavigationHeaderLargeTitle and only accepts a string.
    subtitleComponent?: React.ReactElement;
    title?: string;
    titleCompanion?: React.ReactElement;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        backgroundColor: theme.sidebarBg,
        position: 'absolute',
        width: '100%',
        zIndex: 10,
    },
}));

const NavigationHeader = forwardRef<SearchRef, Props>(({
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
    subtitleComponent,
    title = '',
    titleCompanion,
    hideHeader,
    ...searchProps
}: Props, ref) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const {largeHeight, defaultHeight, headerOffset} = useHeaderHeight();

    const minScrollValue = useDerivedValue(() => scrollValue?.value || 0, [scrollValue]);

    const containerHeight = useAnimatedStyle(() => {
        const calculatedHeight = (isLargeTitle ? largeHeight : defaultHeight) - minScrollValue.value;
        const height = lockValue || calculatedHeight;
        return {
            height: Math.max(height, defaultHeight),
            minHeight: defaultHeight,
            maxHeight: largeHeight + MAX_OVERSCROLL,
        };
    }, [defaultHeight, largeHeight, lockValue, isLargeTitle]);

    const translateY = useDerivedValue(() => (
        lockValue ? -lockValue : Math.min(-minScrollValue.value, headerOffset)
    ), [lockValue, headerOffset]);

    const searchTopStyle = useAnimatedStyle(() => {
        const margin = clamp(-minScrollValue.value, -headerOffset, headerOffset);
        const marginTop = (lockValue ? -lockValue : margin) - SEARCH_INPUT_HEIGHT - SEARCH_INPUT_MARGIN;
        return {marginTop};
    }, [lockValue, headerOffset]);

    return (
        <Animated.View style={[styles.container, containerHeight]}>
            <Header
                defaultHeight={defaultHeight}
                hasSearch={hasSearch}
                isLargeTitle={isLargeTitle}
                heightOffset={lockValue || headerOffset}
                leftComponent={leftComponent}
                onBackPress={onBackPress}
                onTitlePress={onTitlePress}
                rightButtons={rightButtons}
                scrollValue={scrollValue}
                showBackButton={showBackButton}
                subtitle={subtitle}
                subtitleCompanion={subtitleCompanion}
                subtitleComponent={subtitleComponent}
                theme={theme}
                title={title}
                titleCompanion={titleCompanion}
            />
            {isLargeTitle &&
                <NavigationHeaderLargeTitle
                    heightOffset={lockValue || headerOffset}
                    hasSearch={hasSearch}
                    subtitle={subtitle}
                    theme={theme}
                    title={title}
                    translateY={translateY}
                />
            }
            {hasSearch &&
                <NavigationSearch
                    {...searchProps}
                    hideHeader={hideHeader}
                    theme={theme}
                    topStyle={searchTopStyle}
                    ref={ref}
                />
            }
        </Animated.View>
    );
});

NavigationHeader.displayName = 'NavHeader';
export default NavigationHeader;

