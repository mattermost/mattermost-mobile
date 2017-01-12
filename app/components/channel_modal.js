// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {Component, PropTypes} from 'react';
import {Animated, Dimensions} from 'react-native';

const AnimatedView = Animated.View;
const {width: deviceWidth, height: deviceHeight} = Dimensions.get('window');

export default class ChannelModel extends Component {
    static propTypes = {
        children: PropTypes.node,
        duration: PropTypes.number,
        topOffset: PropTypes.number,
        theme: React.PropTypes.object.isRequired,
        visible: PropTypes.bool.isRequired
    }

    static defaultProps = {
        duration: 400,
        topOffset: 0,
        visible: false
    }

    constructor(props) {
        super(props);

        this.state = {
            top: new Animated.Value(deviceHeight)
        };
    }

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
            <AnimatedView style={{flex: 1, position: 'absolute', top: this.state.top, left: 0, height: (deviceHeight - this.props.topOffset), width: deviceWidth, backgroundColor: '#000', opacity: 0.95, overflow: 'hidden'}}>
                {this.props.children}
            </AnimatedView>
        );
    }
}
