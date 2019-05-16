// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    LayoutAnimation,
    Platform,
    StyleSheet,
    View,
} from 'react-native';

import * as CustomPropTypes from 'app/constants/custom_prop_types';

const KEYBOARD_HIDDEN_STATE = 3;
const HW_KEYBOARD_OFFSET = 34;
const HW_KEYBOARD_OFFSET_LANDSCAPE = 22;

export default class KeyboardLayout extends PureComponent {
    static propTypes = {
        children: PropTypes.node,
        isLandscape: PropTypes.bool.isRequired,
        style: CustomPropTypes.Style,
    };

    constructor(props) {
        super(props);

        this.state = {
            keyboardHeight: 0,
        };
    }

    setKeyboardHeight = (event) => {
        if (!event) {
            return;
        }

        const {isLandscape} = this.props;
        const animationConfig = LayoutAnimation.create(
            10,
            LayoutAnimation.Types.keyboard,
            LayoutAnimation.Properties.scaleY,
        );

        LayoutAnimation.configureNext(animationConfig);

        let keyboardHeight = event.height;
        if (event.hasInsets && event.state && event.state !== KEYBOARD_HIDDEN_STATE && !keyboardHeight) {
            keyboardHeight = isLandscape ? HW_KEYBOARD_OFFSET_LANDSCAPE : HW_KEYBOARD_OFFSET;
        }
        this.setState({keyboardHeight});
    };

    render() {
        const layoutStyle = [this.props.style, style.keyboardLayout];

        if (Platform.OS === 'ios') {
            // iOS doesn't resize the app automatically
            // TODO: Find out why showing the keyboard another screen changes the position in the channel screen
            // TODO: Make this happen natively
            // TODO: handle the keyboard in other screens without the inputAccessoryView
            layoutStyle.push({paddingBottom: this.state.keyboardHeight});
        }

        return (
            <View style={layoutStyle}>
                {this.props.children}
            </View>
        );
    }
}

const style = StyleSheet.create({
    keyboardLayout: {
        position: 'relative',
        flex: 1,
    },
});
