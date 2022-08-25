// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Platform, ScrollView, StyleSheet} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

type Props = {
    renderAsFlex: boolean;
    renderRows: (isFullView: boolean) => JSX.Element|null;
    width: number;
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    fullHeight: {
        height: '100%',
    },
    displayFlex: {
        ...Platform.select({
            android: {
                flex: 1,
            },
            ios: {
                flex: 0,
            },
        }),
    },
});

const Table = ({renderAsFlex, renderRows, width}: Props) => {
    const content = renderRows(true);
    const viewStyle = renderAsFlex ? styles.displayFlex : {width};

    if (Platform.OS === 'android') {
        return (
            <ScrollView testID='table.screen'>
                <ScrollView
                    contentContainerStyle={viewStyle}
                    horizontal={true}
                    testID='table.scroll_view'
                >
                    {content}
                </ScrollView>
            </ScrollView>
        );
    }

    return (
        <SafeAreaView
            style={styles.container}
            testID='table.screen'
        >
            <ScrollView
                style={styles.fullHeight}
                contentContainerStyle={viewStyle}
                testID='table.scroll_view'
            >
                {content}
            </ScrollView>
        </SafeAreaView>
    );
};

export default Table;
