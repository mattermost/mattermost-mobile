// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PropTypes, PureComponent} from 'react';
import {StyleSheet, Text, View} from 'react-native';

const Styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
        position: 'absolute',
        borderRadius: 15,
        marginHorizontal: 15,
        height: 25
    }
});

export default class UnreadIndicator extends PureComponent {
    static propTypes = {
        style: View.propTypes.style,
        textStyle: Text.propTypes.style,
        text: PropTypes.node.isRequired
    };

    render() {
        return (
            <View
                style={[Styles.container, this.props.style]}
            >
                {this.props.text}
            </View>
        );
    }
}
