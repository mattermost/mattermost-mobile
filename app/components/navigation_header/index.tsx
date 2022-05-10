// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {FlatList, ScrollView, SectionList} from 'react-native';
import Animated, {useAnimatedStyle} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {useTheme} from '@context/theme';
import useHeaderHeight from '@hooks/header';
import {makeStyleSheetFromTheme} from '@utils/theme';

import NavigationHeaderContext from './context';
import Header, {HeaderRightButton} from './header';
import NavigationHeaderLargeTitle from './large';
import NavigationSearch from './search';
import NavigationHeaderSearchContext from './search_context';

import type {SearchProps} from '@components/search';

type Props = SearchProps & {
    forwardedRef?: React.RefObject<ScrollView | FlatList | SectionList>;
    hasSearch?: boolean;
    isLargeTitle?: boolean;
    leftComponent?: React.ReactElement;
    onBackPress?: () => void;
    onTitlePress?: () => void;
    rightButtons?: HeaderRightButton[];
    scrollValue?: Animated.SharedValue<number>;
    showBackButton?: boolean;
    showHeaderInContext?: boolean;
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
    forwardedRef,
    hasSearch = false,
    isLargeTitle = false,
    leftComponent,
    onBackPress,
    onTitlePress,
    rightButtons,
    scrollValue,
    showBackButton,
    showHeaderInContext = true,
    subtitle,
    subtitleCompanion,
    title = '',
    ...searchProps
}: Props) => {
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const styles = getStyleSheet(theme);

    const {largeHeight, defaultHeight} = useHeaderHeight(isLargeTitle, Boolean(subtitle), hasSearch);
    const containerHeight = useAnimatedStyle(() => {
        const normal = defaultHeight + insets.top;
        const calculated = -(insets.top + (scrollValue?.value || 0));
        return {height: Math.max((normal + calculated), normal)};
    }, []);

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
                    scrollValue={scrollValue}
                    subtitle={subtitle}
                    theme={theme}
                    title={title}
                    top={insets.top}
                />
                }
            </Animated.View>
            {hasSearch &&
            <>
                <NavigationSearch
                    {...searchProps}
                    defaultHeight={defaultHeight}
                    forwardedRef={forwardedRef}
                    largeHeight={largeHeight}
                    scrollValue={scrollValue}
                    theme={theme}
                    top={insets.top}
                />
                <NavigationHeaderSearchContext
                    defaultHeight={defaultHeight}
                    largeHeight={largeHeight}
                    scrollValue={scrollValue}
                    theme={theme}
                />
            </>
            }
            {showHeaderInContext &&
            <NavigationHeaderContext
                defaultHeight={defaultHeight}
                hasSearch={hasSearch}
                isLargeTitle={isLargeTitle}
                largeHeight={largeHeight}
                scrollValue={scrollValue}
                top={insets.top}
            />
            }
        </>
    );
};

export default NavigationHeader;

