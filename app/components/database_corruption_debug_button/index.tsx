// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {DeviceEventEmitter, Pressable, StyleSheet, Text} from 'react-native';

import {Events} from '@constants';
import {useServerUrl} from '@context/server';
import DatabaseManager from '@database/manager';

const styles = StyleSheet.create({
    button: {
        alignSelf: 'flex-start',
        backgroundColor: '#C92A2A',
        borderRadius: 4,
        margin: 8,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    label: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
    },
});

const DatabaseCorruptionDebugButton = () => {
    const serverUrl = useServerUrl();

    if (!__DEV__) {
        return null;
    }

    const onPress = () => {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        DeviceEventEmitter.emit(Events.DATABASE_CORRUPTION_DETECTED, {
            database,
            error: new Error('database disk image is malformed'),
            source: 'debug-button',
        });
    };

    return (
        <Pressable
            onPress={onPress}
            style={styles.button}
            testID='database_corruption_debug_button'
        >
            <Text style={styles.label}>{'Simulate DB corruption'}</Text>
        </Pressable>
    );
};

export default DatabaseCorruptionDebugButton;
