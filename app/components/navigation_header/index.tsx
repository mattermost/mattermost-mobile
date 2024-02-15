// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {forwardRef} from 'react';
import Animated, {useAnimatedStyle, useDerivedValue} from 'react-native-reanimated';

import {SEARCH_INPUT_HEIGHT, SEARCH_INPUT_MARGIN} from '@constants/view';
import {useTheme} from '@context/theme';
import useHeaderHeight, {MAX_OVERSCROLL} from '@hooks/header';
import {clamp} from '@utils/gallery';
import {makeStyleSheetFromTheme} from '@utils/theme';

import Header, {type HeaderRightButton} from './header';
import NavigationHeaderLargeTitle from './large';
import NavigationSearch from './search';

import type {SearchProps, SearchRef} from '@components/search';

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
    title = '',
    hideHeader,
    ...searchProps
}: Props, ref) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const {largeHeight, defaultHeight, headerOffset} = useHeaderHeight();
    const containerHeight = useAnimatedStyle(() => {
        const value = -(scrollValue?.value || 0);
        const calculatedHeight = (isLargeTitle ? largeHeight : defaultHeight) + value;
        const height = lockValue?.value ? lockValue.value : calculatedHeight;
        return {
            height: Math.max(height, defaultHeight),
            minHeight: defaultHeight,
            maxHeight: largeHeight + MAX_OVERSCROLL,
        };
    });

    const minScrollValue = useDerivedValue(() => scrollValue?.value || 0, [scrollValue]);

    const translateY = useDerivedValue(() => (
        lockValue?.value ? -lockValue.value : Math.min(-minScrollValue.value, headerOffset)
    ), [lockValue, minScrollValue, headerOffset]);

    const searchTopStyle = useAnimatedStyle(() => {
        const margin = clamp(-minScrollValue.value, -headerOffset, headerOffset);
        const marginTop = (lockValue?.value ? -lockValue?.value : margin) - SEARCH_INPUT_HEIGHT - SEARCH_INPUT_MARGIN;
        return {marginTop};
    }, [lockValue, headerOffset, scrollValue]);

    const heightOffset = useDerivedValue(() => (
        lockValue?.value ? lockValue.value : headerOffset
    ), [lockValue, headerOffset]);

    return (
        <Animated.View style={[styles.container, containerHeight]}>
            <Header
                defaultHeight={defaultHeight}
                hasSearch={hasSearch}
                isLargeTitle={isLargeTitle}
                heightOffset={heightOffset.value}
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
            />
            {isLargeTitle &&
                <NavigationHeaderLargeTitle
                    heightOffset={heightOffset.value}
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

