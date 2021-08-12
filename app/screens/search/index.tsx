// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect, useState} from 'react';
import {Platform, Text, View} from 'react-native';
import {Navigation, NavigationComponentProps} from 'react-native-navigation';

import BottomTabBar from '@components/bottom_tab_bar';
import {makeStyleSheetFromTheme} from '@utils/theme';

type SearchProps = NavigationComponentProps & {
    theme: Theme;
};

const Search = ({componentId, theme}: SearchProps) => {
    const styles = getStyleSheet(theme);
    const [isFocused, setIsFocused] = useState<boolean>(true);

    useEffect(() => {
        const listener = {
            componentDidAppear: () => {
                // eslint-disable-next-line no-console
                console.log('componentDidAppear', `>>> ${componentId} on ${Platform.OS} <<<`);
                setIsFocused(true);
            },
            componentDidDisappear: () => {
                // eslint-disable-next-line no-console
                console.log('componentDidDisappear', `>>> ${componentId} on ${Platform.OS} <<<`);
                setIsFocused(false);
            },
        };

        const unsubscribe = Navigation.events().registerComponentListener(listener, componentId);
        return () => {
            unsubscribe.remove();
        };
    }, []);

    return (
        <View
            style={styles.container}
            testID='search.screen'
        >
            {isFocused && (<Text style={styles.screenTitle}>{` ${componentId} `}</Text>)}
            <View
                key='bottom.tabbar'
                style={styles.tabContainer}
            >
                <BottomTabBar theme={theme}/>
            </View>
        </View>
    );
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
