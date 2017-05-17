// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    PanResponder,
    StyleSheet,
    Text,
    TouchableWithoutFeedback,
    View
} from 'react-native';

export default class Badge extends PureComponent {
    static defaultProps = {
        extraPaddingHorizontal: 10,
        minHeight: 0,
        minWidth: 0
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

    componentWillMount() {
        this.panResponder = PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onStartShouldSetResponderCapture: () => true,
            onMoveShouldSetResponderCapture: () => true,
            onResponderMove: () => false
        });
    }

    handlePress = () => {
        if (this.props.onPress) {
            this.props.onPress();
        }
    };

    renderText = () => {
        const {count} = this.props;
        let text = count.toString();
        const extra = {};
        if (count < 0) {
            text = '•';

            //the extra margin is to align to the center?
            extra.marginBottom = 1;
        }
        return (
            <Text
                style={[styles.text, this.props.countStyle, extra]}
            >
                {text}
            </Text>
        );
    };

    render() {
        return (
            <TouchableWithoutFeedback
                {...this.panResponder.panHandlers}
                onPress={this.handlePress}
            >
                <View
                    style={[styles.badge, this.props.style]}
                >
                    <View style={styles.wrapper}>
                        {this.renderText()}
                    </View>
                </View>
            </TouchableWithoutFeedback>
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
    wrapper: {
        alignItems: 'center',
        flex: 1,
        justifyContent: 'center'
    },
    text: {
        fontSize: 14,
        color: 'white'
    }
});
