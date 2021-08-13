// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Text, View} from 'react-native';
import {NavigationComponentProps} from 'react-native-navigation';

import BottomTabBar from '@components/bottom_tab_bar';
import Container from '@components/container';
import {makeStyleSheetFromTheme} from '@utils/theme';

type AccountProps = NavigationComponentProps & {
    theme: Theme;
};

const Account = ({componentId, theme}: AccountProps) => {
    const styles = getStyleSheet(theme);

    const renderAccountContent = () => (
        <View
            style={styles.container}
            testID='account.screen'
        >
            <Text style={styles.screenTitle}>{` ${componentId} `}</Text>
        </View>
    );

    return [
        <Container
            componentId={componentId}
            renderChildren={renderAccountContent}
            key='account.screen'
        />,
        <View
            key='account.tabbar'
            style={styles.tabContainer}
        >
            <BottomTabBar theme={theme}/>
        </View>,
    ];
};

Account.options = {
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

export default Account;
