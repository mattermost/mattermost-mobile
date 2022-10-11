// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import Animated, {useAnimatedStyle, useDerivedValue} from 'react-native-reanimated';

import {clamp} from '@app/utils/gallery';
import {useTheme} from '@context/theme';
import useHeaderHeight, {MAX_OVERSCROLL, useStaticHeaderHeight} from '@hooks/header';
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

    // const getStyleSheet = makeStyleSheetFromTheme(() => ({
    container: {
        backgroundColor: theme.sidebarBg,

        // backgroundColor: 'green',
        // marginLeft: 100,
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
    const styles = getStyleSheet(theme);

    const {largeHeight, defaultHeight, headerOffset} = useHeaderHeight(hasSearch);
    const staticHeaderHeight = useStaticHeaderHeight(hasSearch);
    const containerHeight = useAnimatedStyle(() => {
        // 'value' needed for search / recent mentions / saved messages . when drag up, move the header up
        const value = -(scrollValue?.value || 0);
        const height = lockValue?.value ? lockValue.value : staticHeaderHeight + value;
        return {
            height,
            minHeight: defaultHeight,
            maxHeight: largeHeight + MAX_OVERSCROLL,
        };
    }, [lockValue?.value, defaultHeight, largeHeight, staticHeaderHeight, scrollValue]);

    // console.log('\n');
    // console.log('staticHeaderHeight + headerOffset', staticHeaderHeight + headerOffset);
    // console.log('largeHeight, headerOffset, staticHeaderHeight, MAX_OVERSCROLL', largeHeight, headerOffset, staticHeaderHeight, MAX_OVERSCROLL);
    // console.log('lock=', lockValue?.value, 'staticHeight', staticHeaderHeight, 'cnterHeight=', containerHeight.initial.value);

    const minScrollValue = useDerivedValue(() => scrollValue?.value || 0, [scrollValue]);
    const heightOffset = headerOffset;

    const translateY = useDerivedValue(() => (
        lockValue?.value ? -lockValue.value : Math.min(-minScrollValue.value, heightOffset)
    ), [lockValue?.value, minScrollValue.value]);

    const searchTopMargin = useAnimatedStyle(() => {
        const margin = clamp(-minScrollValue.value, -heightOffset, heightOffset);
        return {marginTop: lockValue?.value ? -lockValue?.value : margin};
    }, [lockValue?.value]);

    return (
        <>
            <Animated.View style={[styles.container, containerHeight]}>
                <Header
                    defaultHeight={defaultHeight}
                    hasSearch={hasSearch}
                    isLargeTitle={isLargeTitle}
                    heightOffset={heightOffset}
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
                        heightOffset={heightOffset}
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

