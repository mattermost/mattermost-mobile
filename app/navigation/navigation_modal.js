// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PropTypes, PureComponent} from 'react';
import {
    Animated,
    InteractionManager
} from 'react-native';

const {View: AnimatedView} = Animated;

const ANIMATION_TYPES = {
    SlideFromBottom: 'slideFromBottom',
    Fade: 'fade'
};

export default class NavigationModal extends PureComponent {
    static propTypes = {
        animationType: PropTypes.oneOf([
            ANIMATION_TYPES.SlideFromBottom,
            ANIMATION_TYPES.Fade
        ]),
        children: PropTypes.node,
        deviceHeight: PropTypes.number.isRequired,
        deviceWidth: PropTypes.number.isRequired,
        duration: PropTypes.number,
        show: PropTypes.bool
    }

    static defaultProps = {
        animationType: ANIMATION_TYPES.SlideFromBottom,
        duration: 400,
        show: false
    }

    constructor(props) {
        super(props);

        const top = props.show ? 0 : props.deviceHeight;
        this.state = {
            top: new Animated.Value(top),
            opacity: new Animated.Value(100)
        };
    }

    componentWillReceiveProps(nextProps) {
        if (nextProps.show) {
            let currentRouteKeys;
            const nextRouteKeys = nextProps.children.props.navigationState.routes.map((r) => r.key).join('');
            if (this.state.children) {
                currentRouteKeys = this.state.children.props.navigationState.routes.map((r) => r.key).join('');
            }

            const routesDidChange = currentRouteKeys !== nextRouteKeys;

            // In order for the scene to be shown throughout the
            // animated slide down we have to hang on to it by
            // storing it in state
            if (routesDidChange) {
                this.setState({
                    children: nextProps.children
                });
            }
        }

        if (nextProps.show !== this.props.show) {
            const animationType = nextProps.show ? nextProps.animationType : this.props.animationType;

            if (animationType === ANIMATION_TYPES.SlideFromBottom) {
                InteractionManager.runAfterInteractions(() => {
                    this.slideFromBottomAnimationRunner(nextProps);
                });
            } else if (animationType === ANIMATION_TYPES.Fade) {
                InteractionManager.runAfterInteractions(() => {
                    this.fadeAnimationRunner(nextProps);
                });
            }
        }
    }

    fadeAnimationRunner = (nextProps) => {
        if (nextProps.show) {
            const setOpacityToZero = Animated.timing(this.state.opacity, {
                toValue: 0,
                duration: 0
            });
            const setTopToZero = Animated.timing(this.state.top, {
                toValue: 0,
                duration: 0
            });
            const setOpacityToFull = Animated.timing(this.state.opacity, {
                toValue: 1,
                duration: nextProps.duration
            });
            Animated.sequence([
                setOpacityToZero,
                setTopToZero,
                setOpacityToFull
            ]).start(() => {
                // Once the scene has finished sliding down we can release the child scene
                // which will unmount the scene correctly.
                if (!this.props.show && !nextProps.show) {
                    this.setState({
                        children: null
                    });
                }
            });
        } else {
            const setOpacityToZero = Animated.timing(this.state.opacity, {
                toValue: 0,
                duration: nextProps.duration
            });
            const setTopToDeviceHeight = Animated.timing(this.state.top, {
                toValue: this.props.deviceHeight,
                duration: 0
            });
            const setOpacityToFull = Animated.timing(this.state.opacity, {
                toValue: 1,
                duration: 0
            });
            Animated.sequence([
                setOpacityToZero,
                setTopToDeviceHeight,
                setOpacityToFull
            ]).start(() => {
                // Once the scene has finished sliding down we can release the child scene
                // which will unmount the scene correctly.
                if (!this.props.show && !nextProps.show) {
                    this.setState({
                        children: null
                    });
                }
            });
        }
    }

    slideFromBottomAnimationRunner = (nextProps) => {
        const animateValue = nextProps.show ? 0 : this.props.deviceHeight;

        Animated.timing(this.state.top, {
            toValue: animateValue,
            duration: nextProps.duration
        }).start(() => {
            // Once the scene has finished sliding down we can release the child scene
            // which will unmount the scene correctly.
            if (!this.props.show && !nextProps.show) {
                this.setState({
                    children: null
                });
            }
        });
    }

    render() {
        return (
            <AnimatedView
                onLayout={this.onLayout}
                style={{
                    position: 'absolute',
                    width: this.props.deviceWidth,
                    height: this.props.deviceHeight,
                    top: this.state.top,
                    left: 0,
                    backgroundColor: '#0000',
                    opacity: this.state.opacity
                }}
            >
                {this.state.children}
            </AnimatedView>
        );
    }
}
