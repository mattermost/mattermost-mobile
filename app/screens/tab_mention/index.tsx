// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Text, View} from 'react-native';
import {NavigationComponentProps} from 'react-native-navigation';

import BottomTabBar from '@components/bottom_tab_bar';
import Container from '@components/container';
import {makeStyleSheetFromTheme} from '@utils/theme';

type MentionProps = NavigationComponentProps & {
    theme: Theme;
};

const Mention = ({componentId, theme}: MentionProps) => {
    const styles = getStyleSheet(theme);

    const renderMentionContent = () => (
        <View
            style={styles.container}
            testID='mention.screen'
        >
            <Text style={styles.screenTitle}>{` ${componentId} `}</Text>
        </View>
    );

    return [
        <Container
            componentId={componentId}
            renderChildren={renderMentionContent}
            key='mention.screen'
        />,
        <View
            key='bottom.tabbar'
            style={styles.tabContainer}
        >
            <BottomTabBar theme={theme}/>
        </View>,
    ];
};

Mention.options = {
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

export default Mention;
