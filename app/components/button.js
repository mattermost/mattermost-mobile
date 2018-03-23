// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';

import {ActivityIndicator, StyleSheet, TouchableHighlight, View} from 'react-native';

import {GlobalStyles} from 'app/styles';

const styles = StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: 'row',
    },

    loading: {
        marginLeft: 3,
    },
});

export default class Button extends PureComponent {
    static propTypes = {
        children: PropTypes.node,
        loading: PropTypes.bool,
        onPress: PropTypes.func.isRequired,
    };

    onPress = () => {
        if (!this.props.loading) {
            this.props.onPress();
        }
    };

    render() {
        let loading = null;
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
                    {this.props.children}
                    {loading}
                </View>
            </TouchableHighlight>
        );
    }
}
