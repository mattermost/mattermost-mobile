// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';
import {View, Text, StyleSheet} from 'react-native';

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row'
    },
    text: {
        paddingVertical: 2,
        paddingHorizontal: 4,
        backgroundColor: 'transparent',
        fontSize: 14,
        textAlign: 'center',
        textAlignVertical: 'center'
    }
});

export default class Badge extends React.Component {
    static defaultProps = {
        extraPaddingHorizontal: 10,
        minHeight: 0,
        minWidth: 0
    };

    static propTypes = {
        count: React.PropTypes.number.isRequired,
        extraPaddingHorizontal: React.PropTypes.number,
        style: View.propTypes.style,
        countStyle: Text.propTypes.style,
        minHeight: React.PropTypes.number,
        minWidth: React.PropTypes.number
    };

    constructor(props) {
        super(props);
        this.width = 0;
    }

    renderText = () => {
        return (
            <Text
                onLayout={this.onLayout}
                style={[styles.text, this.props.countStyle]}
            >
                {this.props.count}
            </Text>
        );
    };

    onLayout = (e) => {
        let width;

        if (e.nativeEvent.layout.width <= e.nativeEvent.layout.height) {
            width = e.nativeEvent.layout.height;
        } else {
            width = e.nativeEvent.layout.width + this.props.extraPaddingHorizontal;
        }

        width = Math.max(width, this.props.minWidth);
        if (this.width === width) {
            return;
        }

        this.width = width;
        const height = Math.max(e.nativeEvent.layout.height, this.props.minHeight);
        const borderRadius = height / 2;
        this.container.setNativeProps({
            style: {
                width,
                height,
                borderRadius
            }
        });
    };

    render() {
        return (
            <View
                ref={(component) => {
                    this.container = component;
                }}
                style={[styles.container, this.props.style]}
            >
                {this.renderText()}
            </View>
        );
    }
}
