// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Animated,
    StyleSheet,
    TouchableWithoutFeedback,
    View,
} from 'react-native';

import EventEmitter from 'mattermost-redux/utils/event_emitter';

import {NavigationTypes} from 'app/constants';
import {emptyFunction} from 'app/utils/general';

import OptionsModalList from './options_modal_list';

const {View: AnimatedView} = Animated;
const DURATION = 200;

export default class OptionsModal extends PureComponent {
    static propTypes = {
        items: PropTypes.array.isRequired,
        deviceHeight: PropTypes.number.isRequired,
        deviceWidth: PropTypes.number.isRequired,
        navigator: PropTypes.object,
        onCancelPress: PropTypes.func,
        title: PropTypes.oneOfType([
            PropTypes.string,
            PropTypes.object,
        ]),
    };

    static defaultProps = {
        onCancelPress: emptyFunction,
    };

    constructor(props) {
        super(props);

        this.state = {
            top: new Animated.Value(props.deviceHeight),
        };
    }

    componentDidMount() {
        EventEmitter.on(NavigationTypes.NAVIGATION_CLOSE_MODAL, this.close);
        Animated.timing(this.state.top, {
            toValue: 0,
            duration: DURATION,
        }).start();
    }

    componentWillUnmount() {
        EventEmitter.off(NavigationTypes.NAVIGATION_CLOSE_MODAL, this.close);
    }

    handleCancel = () => {
        this.props.onCancelPress();
        this.close();
    };

    close = () => {
        Animated.timing(this.state.top, {
            toValue: this.props.deviceHeight,
            duration: DURATION,
        }).start(() => {
            this.props.navigator.dismissModal({
                animationType: 'none',
            });
        });
    };

    render() {
        const {
            items,
            title,
        } = this.props;

        return (
            <TouchableWithoutFeedback onPress={this.handleCancel}>
                <View style={style.wrapper}>
                    <AnimatedView style={{height: this.props.deviceHeight, left: 0, top: this.state.top, width: this.props.deviceWidth}}>
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
        flex: 1,
    },
});
