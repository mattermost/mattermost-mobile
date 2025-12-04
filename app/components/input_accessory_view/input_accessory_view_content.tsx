// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
    },
});

/**
 * InputAccessoryViewContent - Content for input accessory view
 */
const InputAccessoryViewContent = () => {
    return (
        <View style={styles.container}>
            <Text>{'🙂'}</Text>
        </View>
    );
};

export default InputAccessoryViewContent;

