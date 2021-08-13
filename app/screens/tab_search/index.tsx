// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Text, View} from 'react-native';
import {NavigationComponentProps} from 'react-native-navigation';

import BottomTabBar from '@components/bottom_tab_bar';
import Container from '@components/container';
import {makeStyleSheetFromTheme} from '@utils/theme';

type SearchProps = NavigationComponentProps & {
    theme: Theme;
};

const Search = ({componentId, theme}: SearchProps) => {
    const styles = getStyleSheet(theme);

    const renderSearchContent = () => (
        <View
            style={styles.container}
            testID='search.screen'
        >
            <Text style={styles.screenTitle}>{` ${componentId} `}</Text>

        </View>
    );

    return [
        <Container
            componentId={componentId}
            renderChildren={renderSearchContent}
            key='search.screen'
        />,
        <View
            key='search.tabbar'
            style={styles.tabContainer}
        >
            <BottomTabBar theme={theme}/>
        </View>,
    ];
};

Search.options = {
    topBar: {
        visible: false,
    },
};

const getStyleSheet = makeStyleSheetFromTheme(() => ({
    container: {
        flex: 1,
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
    },
    tabContainer: {
        position: 'absolute',
        bottom: 0,
    },
    screenTitle: {
        fontSize: 30,
        alignSelf: 'center',
    },
}));

export default Search;
