// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {Platform, ScrollView, StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import SecurityManager from '@managers/security_manager';
import {popTopScreen} from '@screens/navigation';

import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    componentId: AvailableScreens;
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

const Table = ({componentId, renderAsFlex, renderRows, width}: Props) => {
    const content = renderRows(true);
    const viewStyle = renderAsFlex ? styles.displayFlex : {width};

    const close = useCallback(() => {
        popTopScreen(componentId);
    }, [componentId]);

    useAndroidHardwareBackHandler(componentId, close);

    if (Platform.OS === 'android') {
        return (
            <View
                style={styles.container}
                nativeID={SecurityManager.getShieldScreenId(componentId)}
            >
                <ScrollView testID='table.screen'>
                    <ScrollView
                        contentContainerStyle={viewStyle}
                        horizontal={true}
                        testID='table.scroll_view'
                    >
                        {content}
                    </ScrollView>
                </ScrollView>
            </View>
        );
    }

    return (
        <SafeAreaView
            style={styles.container}
            testID='table.screen'
            nativeID={SecurityManager.getShieldScreenId(componentId)}
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
