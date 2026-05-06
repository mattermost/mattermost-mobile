// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {forwardRef} from 'react';
import Animated, {useAnimatedStyle, useDerivedValue} from 'react-native-reanimated';

import {CLASSIFICATION_BANNER_TOTAL_HEIGHT, SEARCH_INPUT_HEIGHT, SEARCH_INPUT_MARGIN} from '@constants/view';
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
    rightComponent?: React.ReactElement;
    scrollValue?: Animated.SharedValue<number>;
    lockValue?: number;
    hideHeader?: () => void;
    showBackButton?: boolean;
    subtitle?: string;
    subtitleCompanion?: React.ReactElement;
    title?: string;
    titleCompanion?: React.ReactElement;
    classificationBanner?: React.ReactNode;
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
    rightComponent,
    scrollValue,
    lockValue,
    showBackButton,
    subtitle,
    subtitleCompanion,
    title = '',
    titleCompanion,
    hideHeader,
    classificationBanner,
    ...searchProps
}: Props, ref) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const {largeHeight, defaultHeight, headerOffset} = useHeaderHeight();

    const bannerHeight = classificationBanner ? CLASSIFICATION_BANNER_TOTAL_HEIGHT : 0;
    const adjustedDefaultHeight = defaultHeight + bannerHeight;
    const adjustedLargeHeight = largeHeight + bannerHeight;

    const minScrollValue = useDerivedValue(() => scrollValue?.value || 0, [scrollValue]);

    const containerHeight = useAnimatedStyle(() => {
        const calculatedHeight = (isLargeTitle ? adjustedLargeHeight : adjustedDefaultHeight) - minScrollValue.value;
        const height = lockValue || calculatedHeight;
        return {
            height: Math.max(height, adjustedDefaultHeight),
            minHeight: adjustedDefaultHeight,
            maxHeight: adjustedLargeHeight + MAX_OVERSCROLL,
        };
    }, [adjustedDefaultHeight, adjustedLargeHeight, lockValue, isLargeTitle]);

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
                rightComponent={rightComponent}
                scrollValue={scrollValue}
                showBackButton={showBackButton}
                subtitle={subtitle}
                subtitleCompanion={subtitleCompanion}
                theme={theme}
                title={title}
                titleCompanion={titleCompanion}
                topComponent={classificationBanner}
                topComponentHeight={bannerHeight}
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

