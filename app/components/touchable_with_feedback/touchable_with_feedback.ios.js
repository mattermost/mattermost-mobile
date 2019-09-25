// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import {PanResponder, TouchableHighlight, TouchableOpacity, TouchableWithoutFeedback, View} from 'react-native';
import PropTypes from 'prop-types';

import CustomPropTypes from 'app/constants/custom_prop_types';

export default class TouchableWithFeedbackIOS extends PureComponent {
    static propTypes = {
        children: CustomPropTypes.Children,
        cancelTouchOnPanning: PropTypes.bool,
        type: PropTypes.oneOf(['native', 'opacity', 'none']),
    };

    static defaultProps = {
        type: 'native',
    };

    constructor(props) {
        super(props);

        this.panResponder = PanResponder.create({
            onMoveShouldSetPanResponderCapture: (evt, gestureState) => {
                return this.props.cancelTouchOnPanning && (gestureState.dx >= 5 || gestureState.dy >= 5 || gestureState.vx > 5);
            },
        });
    }

    render() {
        const {children, type, ...props} = this.props;

        switch (type) {
        case 'native':
            return (
                <View {...this.panResponder.panHandlers}>
                    <TouchableHighlight
                        {...props}
                    >
                        {children}
                    </TouchableHighlight>
                </View>
            );
        case 'opacity':
            return (
                <TouchableOpacity
                    {...props}
                >
                    {children}
                </TouchableOpacity>
            );
        case 'none':
            return (
                <TouchableWithoutFeedback
                    {...props}
                >
                    {children}
                </TouchableWithoutFeedback>
            );
        }

        return null;
    }
}
