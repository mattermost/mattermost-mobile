// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';
import {ActivityIndicator, View, StyleSheet} from 'react-native';

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },

    loading: {
        marginLeft: 3
    }
});

export default class Button extends React.Component {
    render() {
        return (
            <View style={styles.container}>
                <ActivityIndicator
                    style={styles.loading}
                    animating={true}
                    size='large'
                />
            </View>
        );
    }
}