// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect} from 'react';
import {Platform, ScrollView, StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {navigateBack} from '@screens/navigation';
import CallbackStore from '@store/callback_store';

import type {AvailableScreens} from '@typings/screens/navigation';

export type TableScreenProps = {
    componentId: AvailableScreens;
    renderAsFlex: boolean;
    width: number;
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    fullHeight: {
        height: '100%',
        paddingHorizontal: 5,
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

const Table = ({componentId, renderAsFlex, width}: TableScreenProps) => {
    const contentCallback = CallbackStore.getCallback<(isFullView: boolean) => JSX.Element|null>();
    const content = contentCallback?.(true);
    const viewStyle = renderAsFlex ? styles.displayFlex : {width};

    useEffect(() => {
        return () => {
            CallbackStore.removeCallback();
        };
    }, []);

    useAndroidHardwareBackHandler(componentId, navigateBack);

    if (Platform.OS === 'android') {
        return (
            <View style={styles.container}>
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
