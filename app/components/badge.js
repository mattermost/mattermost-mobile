// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PropTypes, PureComponent} from 'react';
import {View, Text, TouchableWithoutFeedback, StyleSheet} from 'react-native';

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

    constructor(props) {
        super(props);
        this.width = 0;
    }

    renderText = () => {
        const {count} = this.props;
        let text = count.toString();
        if (count < 0) {
            text = '•';
        }
        return (
            <Text
                onLayout={this.onLayout}
                style={[styles.text, this.props.countStyle]}
            >
                {text}
            </Text>
        );
    };

    badgeRef = (ref) => {
        this.container = ref;
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
                ref={this.badgeRef}
                style={[styles.container, this.props.style]}
            >
                <TouchableWithoutFeedback onPress={this.props.onPress}>
                    <View>
                        {this.renderText()}
                    </View>
                </TouchableWithoutFeedback>
            </View>
        );
    }
}
