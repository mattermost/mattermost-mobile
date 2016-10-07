// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';

import {
    AppRegistry,
    StyleSheet,
    Text,
    View
} from 'react-native';

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F5FCFF'
    },
    welcome: {
        fontSize: 20,
        textAlign: 'center',
        margin: 10
    },
    instructions: {
        textAlign: 'center',
        color: '#333333',
        marginBottom: 5
    }
});

class Mattermost extends React.Component {
    render() {
        return (
            <View style={styles.container}>
                <Text style={styles.welcome}>
                    {'Welcome to React Native!'}
                </Text>
                <Text style={styles.instructions}>
                    {'To get started, edit index.android.jsx'}
                </Text>
                <Text style={styles.instructions}>
                    {'Double tap R on your keyboard to reload\nShake or press menu button for dev menu'}
                </Text>
            </View>
        );
    }
}

AppRegistry.registerComponent('Mattermost', () => Mattermost);
