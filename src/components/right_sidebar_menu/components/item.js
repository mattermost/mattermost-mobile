// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';

import {StyleSheet, TouchableHighlight, View} from 'react-native';

const Styles = StyleSheet.create({
    item: {
        alignItems: 'center',
        height: 40,
        paddingLeft: 10,
        paddingRight: 10,
        flex: 1,
        flexDirection: 'row'
    }
});

export default class Item extends React.Component {
    static propTypes = {
        children: React.PropTypes.node,
        onPress: React.PropTypes.func,
        style: React.PropTypes.oneOfType([
            React.PropTypes.object,
            React.PropTypes.array
        ])
    }

    render() {
        return (
            <TouchableHighlight
                underlayColor='rgba(255, 255, 255, 0.3)'
                onPress={this.props.onPress}
                style={this.props.style}
            >
                <View style={Styles.item}>
                    {this.props.children}
                </View>
            </TouchableHighlight>
        );
    }
}
