// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PropTypes, PureComponent} from 'react';
import {
    Animated,
    Dimensions
} from 'react-native';

const {View: AnimatedView} = Animated;
const {width: deviceWidth, height: deviceHeight} = Dimensions.get('window');

export default class NavigationModal extends PureComponent {
    static propTypes = {
        show: PropTypes.bool
    }

    static defaultProps = {
        show: false
    }

    state = {
        top: new Animated.Value(deviceHeight)
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
            const animateValue = nextProps.show ? 0 : deviceHeight;

            Animated.timing(this.state.top, {
                toValue: animateValue,
                duration: 400
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
    }

    render() {
        return (
            <AnimatedView style={{position: 'absolute', width: deviceWidth, height: deviceHeight, top: this.state.top, left: 0, backgroundColor: '#0000'}}>
                {this.state.children}
            </AnimatedView>
        );
    }
}
