// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PropTypes, PureComponent} from 'react';
import {
    Animated,
    Dimensions,
    StyleSheet,
    TouchableWithoutFeedback,
    View
} from 'react-native';

import OptionsModalList from './options_modal_list';

const {View: AnimatedView} = Animated;
const {height: deviceHeight, width: deviceWidth} = Dimensions.get('window');
const DURATION = 200;

export default class OptionsModal extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            closeModal: PropTypes.func.isRequired
        }),
        items: PropTypes.array.isRequired,
        onCancelPress: PropTypes.func,
        requestClose: PropTypes.bool, // eslint-disable-line react/no-unused-prop-types
        title: PropTypes.string
    }

    static defaultProps = {
        onCancelPress: () => false
    }

    static navigationProps = {
        hideNavBar: true,
        modalAnimationType: 'fade'
    }

    state = {
        top: new Animated.Value(deviceHeight)
    }

    componentDidMount() {
        Animated.timing(this.state.top, {
            toValue: 0,
            duration: DURATION
        }).start();
    }

    componentWillReceiveProps(nextProps) {
        if (nextProps.requestClose) {
            this.close();
        }
    }

    close = () => {
        Animated.timing(this.state.top, {
            toValue: deviceHeight,
            duration: DURATION
        }).start(() => {
            this.props.actions.closeModal();
            this.props.onCancelPress();
        });
    }

    render() {
        const {
            actions,
            items,
            title
        } = this.props;

        return (
            <TouchableWithoutFeedback onPress={actions.goBack}>
                <View style={style.wrapper}>
                    <AnimatedView style={{height: deviceHeight, left: 0, top: this.state.top, width: deviceWidth}}>
                        <OptionsModalList
                            goBack={actions.goBack}
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
