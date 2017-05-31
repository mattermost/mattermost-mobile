// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    StyleSheet,
    Text,
    TouchableWithoutFeedback,
    View,
    ViewPropTypes
} from 'react-native';

export default class UnreadIndicator extends PureComponent {
    static propTypes = {
        style: ViewPropTypes.style,
        textStyle: Text.propTypes.style,
        text: PropTypes.node.isRequired,
        onPress: PropTypes.func
    };

    static defaultProps = {
        onPress: () => true
    };

    render() {
        return (
            <TouchableWithoutFeedback onPress={this.props.onPress}>
                <View
                    style={[Styles.container, this.props.style]}
                >
                    {this.props.text}
                </View>
            </TouchableWithoutFeedback>
        );
    }
}

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
