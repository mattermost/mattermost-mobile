// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import Animated, {useAnimatedStyle, useDerivedValue} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import ViewConstants from '@constants/view';
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

    const {largeHeight, defaultHeight, headerOffset} = useHeaderHeight(hasSearch);
    const containerHeight = useAnimatedStyle(() => {
        const minHeight = defaultHeight + insets.top;
        const value = -(scrollValue?.value || 0);
        const calculatedHeight = (isLargeTitle ? largeHeight : defaultHeight) + value;
        const height = lockValue?.value ? lockValue.value : calculatedHeight;
        return {
            height: Math.max(height, minHeight),
            minHeight,
            maxHeight: largeHeight + insets.top + MAX_OVERSCROLL,
        };
    });

    const minScrollValue = useDerivedValue(() => scrollValue?.value || 0, [scrollValue]);

    const translateY = useDerivedValue(() => (
        lockValue?.value ? -lockValue.value : Math.min(-minScrollValue.value, headerOffset)
    ), [lockValue?.value, minScrollValue.value, headerOffset]);

    const searchTopMargin = useAnimatedStyle(() => {
        const margin = Math.min(-Math.min(minScrollValue.value, headerOffset), headerOffset);
        const unlockedBottomMargin = margin + ViewConstants.UNLOCKED_SEARCH_BOTTOM_MARGIN;
        const bottomMargin = lockValue?.value ? -lockValue?.value : unlockedBottomMargin;
        return {
            marginTop: bottomMargin - ViewConstants.SEARCH_INPUT_HEIGHT,
        };
    }, [lockValue?.value, headerOffset, minScrollValue.value]);

    return (
        <>
            <Animated.View style={[styles.container, containerHeight]}>
                <Header
                    defaultHeight={defaultHeight}
                    hasSearch={hasSearch}
                    isLargeTitle={isLargeTitle}
                    heightOffset={headerOffset}
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
                        heightOffset={headerOffset}
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
                        top={0}
                        topMargin={searchTopMargin}
                    />
                }
            </Animated.View>
        </>
    );
};

export default NavigationHeader;

