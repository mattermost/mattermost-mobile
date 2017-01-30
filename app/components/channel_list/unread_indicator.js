// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';
import PureRenderMixin from 'react-addons-pure-render-mixin';
import {StyleSheet, Text, View} from 'react-native';

const Styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
        position: 'absolute',
        borderRadius: 15,
        marginLeft: 25,
        width: 250,
        height: 25
    }
});

export default class UnreadIndicator extends React.Component {
    static propTypes = {
        style: View.propTypes.style,
        textStyle: Text.propTypes.style,
        text: React.PropTypes.node.isRequired
    };

    constructor(props) {
        super(props);

        this.shouldComponentUpdate = PureRenderMixin.shouldComponentUpdate.bind(this);
    }

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
