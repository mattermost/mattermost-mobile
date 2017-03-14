// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PropTypes, PureComponent} from 'react';
import {View, Text, TouchableWithoutFeedback, StyleSheet} from 'react-native';

export default class Badge extends PureComponent {
    static defaultProps = {
        extraPaddingHorizontal: 10,
        minHeight: 0,
        minWidth: 0,
        onPress: () => true
    };

    static propTypes = {
        count: PropTypes.number.isRequired,
        extraPaddingHorizontal: PropTypes.number,
        style: View.propTypes.style,
        countStyle: Text.propTypes.style,
        minHeight: PropTypes.number,
        minWidth: PropTypes.number,
        onPress: PropTypes.func
    };

    renderText = () => {
        const {count} = this.props;
        let text = count.toString();
        if (count < 0) {
            text = '•';
        }
        return (
            <Text
                style={[styles.text, this.props.countStyle]}
            >
                {text}
            </Text>
        );
    };

    render() {
        return (
            <View style={[styles.badge, this.props.style]}>
                <TouchableWithoutFeedback onPress={this.props.onPress}>
                    <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
                        {this.renderText()}
                    </View>
                </TouchableWithoutFeedback>
            </View>
        );
    }
}

const styles = StyleSheet.create({
    badge: {
        top: 2,
        padding: 12,
        paddingTop: 3,
        paddingBottom: 3,
        backgroundColor: '#444',
        borderRadius: 20,
        position: 'absolute',
        right: 30
    },
    text: {
        fontSize: 14,
        color: 'white'
    }
});
