// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';
import {TouchableHighlight, Text, ActivityIndicator, View, StyleSheet} from 'react-native';

import {GlobalStyles} from '../styles';

const styles = StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: 'row'
    },

    loading: {
        marginLeft: 3
    }
});

export default class Button extends React.Component {
    static propTypes = {
        text: React.PropTypes.string.isRequired,
        loading: React.PropTypes.bool,
        onPress: React.PropTypes.func.isRequired
    }

    onPress = () => {
        if (!this.props.loading) {
            this.props.onPress();
        }
    }

    render() {
        var loading = null;

        if (this.props.loading) {
            loading = (
                <ActivityIndicator
                    style={styles.loading}
                    animating={true}
                    size='small'
                />
            );
        }

        return (
            <TouchableHighlight
                style={GlobalStyles.button}
                underlayColor='#B5B5B5'
                onPress={this.onPress}
            >
                <View style={styles.container}>
                    <Text style={GlobalStyles.buttonText}>{this.props.text}</Text>
                    {loading}
                </View>
            </TouchableHighlight>
        );
    }
}