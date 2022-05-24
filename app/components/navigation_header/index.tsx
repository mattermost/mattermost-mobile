// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {View} from 'react-native';
import Animated from 'react-native-reanimated';

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
    hasSearch?: boolean;
    isLargeTitle?: boolean;
    leftComponent?: React.ReactElement;
    onBackPress?: () => void;
    onTitlePress?: () => void;
    rightButtons?: HeaderRightButton[];
    headerPosition?: Animated.SharedValue<number>;
    setHeaderVisibility?: (visible: boolean) => void;
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
    hasSearch = false,
    isLargeTitle = false,
    leftComponent,
    onBackPress,
    onTitlePress,
    rightButtons,
    headerPosition,
    showBackButton,
    showHeaderInContext = true,
    subtitle,
    subtitleCompanion,
    title = '',
    setHeaderVisibility,
    ...searchProps
}: Props) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const {largeHeight, defaultHeight} = useHeaderHeight(isLargeTitle, Boolean(subtitle), hasSearch);
    const containerHeight = useMemo(() => {
        return {height: defaultHeight};
    }, []);

    return (
        <>
            <View style={[styles.container, containerHeight]}>
                <Header
                    defaultHeight={defaultHeight}
                    hasSearch={hasSearch}
                    isLargeTitle={isLargeTitle}
                    largeHeight={largeHeight}
                    leftComponent={leftComponent}
                    onBackPress={onBackPress}
                    onTitlePress={onTitlePress}
                    rightButtons={rightButtons}
                    headerPosition={headerPosition}
                    showBackButton={showBackButton}
                    subtitle={subtitle}
                    subtitleCompanion={subtitleCompanion}
                    theme={theme}
                    title={title}
                />
                {isLargeTitle &&
                <NavigationHeaderLargeTitle
                    defaultHeight={defaultHeight}
                    hasSearch={hasSearch}
                    largeHeight={largeHeight}
                    headerPosition={headerPosition}
                    subtitle={subtitle}
                    theme={theme}
                    title={title}
                />
                }
            </View>
            {hasSearch &&
            <>
                <NavigationSearch
                    {...searchProps}
                    largeHeight={largeHeight}
                    headerPosition={headerPosition}
                    setHeaderVisibility={setHeaderVisibility}
                    theme={theme}
                />
                <NavigationHeaderSearchContext
                    defaultHeight={defaultHeight}
                    largeHeight={largeHeight}
                    headerPosition={headerPosition}
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
                headerPosition={headerPosition}
            />
            }
        </>
    );
};

export default NavigationHeader;

