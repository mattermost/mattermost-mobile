// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';
import {StyleSheet, View} from 'react-native';

const styles = StyleSheet.create({
    container: {
        height: 40,
        width: 165,
        backgroundColor: 'red',
    },
});

const PlaybackBox = () => {
    return (
        <View
            style={styles.container}
        />
    );
};

export default PlaybackBox;
