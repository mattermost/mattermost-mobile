// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PropTypes, PureComponent} from 'react';
import {
    Animated,
    Dimensions,
    StyleSheet,
    TouchableWithoutFeedback,
    View
} from 'react-native';

import EventEmitter from 'mattermost-redux/utils/event_emitter';

import {NavigationTypes} from 'app/constants';

import OptionsModalList from './options_modal_list';

const {View: AnimatedView} = Animated;
const {height: deviceHeight, width: deviceWidth} = Dimensions.get('window');
const DURATION = 200;

export default class OptionsModal extends PureComponent {
    static propTypes = {
        items: PropTypes.array.isRequired,
        navigator: PropTypes.object,
        title: PropTypes.oneOfType([
            PropTypes.string,
            PropTypes.object
        ])
    };

    state = {
        top: new Animated.Value(deviceHeight)
    };

    componentDidMount() {
        EventEmitter.on(NavigationTypes.NAVIGATION_CLOSE_MODAL, this.close);
        Animated.timing(this.state.top, {
            toValue: 0,
            duration: DURATION
        }).start();
    }

    componentWillUnmount() {
        EventEmitter.off(NavigationTypes.NAVIGATION_CLOSE_MODAL, this.close);
    }

    close = () => {
        Animated.timing(this.state.top, {
            toValue: deviceHeight,
            duration: DURATION
        }).start(() => {
            this.props.navigator.dismissModal({
                animationType: 'none'
            });
        });
    };

    render() {
        const {
            items,
            title
        } = this.props;

        return (
            <TouchableWithoutFeedback onPress={this.close}>
                <View style={style.wrapper}>
                    <AnimatedView style={{height: deviceHeight, left: 0, top: this.state.top, width: deviceWidth}}>
                        <OptionsModalList
                            items={items}
                            onCancelPress={this.close}
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
