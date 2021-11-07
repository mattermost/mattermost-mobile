// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import LottieView from 'lottie-react-native';
import React from 'react';
import {StyleSheet, View} from 'react-native';

const Loading = () => (
    <View style={styles.container}>
        <LottieView
            source={require('./spinner.json')}
            autoPlay={true}
            loop={true}
        />
    </View>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: 20,
        maxHeight: 40,
    },
    lottie: {
        height: 32,
        width: 32,
    },
});

export default Loading;
