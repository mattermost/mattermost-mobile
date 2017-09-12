// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Animated,
    Dimensions,
    StyleSheet,
    TouchableWithoutFeedback,
    View
} from 'react-native';
import Orientation from 'react-native-orientation';

import EventEmitter from 'mattermost-redux/utils/event_emitter';

import {NavigationTypes} from 'app/constants';
import {emptyFunction} from 'app/utils/general';

import OptionsModalList from './options_modal_list';

const {View: AnimatedView} = Animated;
const DURATION = 200;

export default class OptionsModal extends PureComponent {
    static propTypes = {
        items: PropTypes.array.isRequired,
        navigator: PropTypes.object,
        onCancelPress: PropTypes.func,
        title: PropTypes.oneOfType([
            PropTypes.string,
            PropTypes.object
        ])
    };

    static defaultProps = {
        onCancelPress: emptyFunction
    };

    constructor(props) {
        super(props);

        const {height: deviceHeight, width: deviceWidth} = Dimensions.get('window');
        this.state = {
            deviceHeight,
            deviceWidth,
            top: new Animated.Value(deviceHeight)
        };
    }

    componentWillMount() {
        Orientation.addOrientationListener(this.orientationDidChange);
    }

    componentDidMount() {
        EventEmitter.on(NavigationTypes.NAVIGATION_CLOSE_MODAL, this.close);
        Animated.timing(this.state.top, {
            toValue: 0,
            duration: DURATION
        }).start();
    }

    componentWillUnmount() {
        Orientation.removeOrientationListener(this.orientationDidChange);
        EventEmitter.off(NavigationTypes.NAVIGATION_CLOSE_MODAL, this.close);
    }

    handleCancel = () => {
        this.props.onCancelPress();
        this.close();
    };

    close = () => {
        Animated.timing(this.state.top, {
            toValue: this.state.deviceHeight,
            duration: DURATION
        }).start(() => {
            this.props.navigator.dismissModal({
                animationType: 'none'
            });
        });
    };

    orientationDidChange = () => {
        setTimeout(() => {
            const {height: deviceHeight, width: deviceWidth} = Dimensions.get('window');
            this.setState({deviceWidth, deviceHeight});
        }, 100);
    };

    render() {
        const {
            items,
            title
        } = this.props;

        return (
            <TouchableWithoutFeedback onPress={this.close}>
                <View style={style.wrapper}>
                    <AnimatedView style={{height: this.state.deviceHeight, left: 0, top: this.state.top, width: this.state.deviceWidth}}>
                        <OptionsModalList
                            items={items}
                            onCancelPress={this.handleCancel}
                            title={title}
                        />
                    </AnimatedView>
                </View>
            </TouchableWithoutFeedback>
        );
    }
}

const style = StyleSheet.create({
    wrapper: {
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        flex: 1
    }
});
