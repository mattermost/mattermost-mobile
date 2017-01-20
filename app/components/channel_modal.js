// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PropTypes, PureComponent} from 'react';
import {Animated, Dimensions} from 'react-native';

const {View: AnimatedView} = Animated;
const {width: deviceWidth, height: deviceHeight} = Dimensions.get('window');

export default class ChannelModal extends PureComponent {
    static propTypes = {
        children: PropTypes.node.isRequired,
        duration: PropTypes.number.isRequired,
        topOffset: PropTypes.number.isRequired,
        theme: PropTypes.object.isRequired,
        visible: PropTypes.bool.isRequired
    }

    static defaultProps = {
        duration: 400,
        topOffset: 0,
        visible: false
    }

    state = {
        top: new Animated.Value(deviceHeight)
    };

    componentWillReceiveProps(nextProps) {
        if (this.props.visible === nextProps.visible) {
            return;
        }

        const animateValue = nextProps.visible ? this.props.topOffset : deviceHeight;

        Animated.timing(this.state.top, {
            toValue: animateValue,
            duration: this.props.duration
        }).start();
    }

    render() {
        return (
            <AnimatedView style={{flex: 1, position: 'absolute', top: this.state.top, left: 0, height: (deviceHeight - this.props.topOffset), width: deviceWidth, backgroundColor: this.props.theme.channelDropdownBg, opacity: 0.95, overflow: 'hidden'}}>
                {this.props.children}
            </AnimatedView>
        );
    }
}
