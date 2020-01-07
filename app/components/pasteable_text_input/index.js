// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import PropTypes from 'prop-types';
import {Animated, Easing, NativeEventEmitter, NativeModules, Platform, TextInput} from 'react-native';
import CustomTextInput from './custom_text_input';
import {ConditionalWrapper} from 'app/components/conditionalWrapper';

const {OnPasteEventManager} = NativeModules;
const OnPasteEventEmitter = new NativeEventEmitter(OnPasteEventManager);

export class PasteableTextInput extends React.Component {
    static propTypes = {
        ...TextInput.PropTypes,
        onPaste: PropTypes.func,
        forwardRef: PropTypes.any,
    }

    state = {
        inputHeight: new Animated.Value(33),
    };

    componentDidMount() {
        this.subscription = OnPasteEventEmitter.addListener('onPaste', this.onPaste);
    }

    componentWillUnmount() {
        if (this.subscription) {
            this.subscription.remove();
        }
    }

    onPaste = (event) => {
        const {onPaste} = this.props;
        return onPaste?.(null, event);
    }

    animateHeight = (height) => {
        if (Platform.OS === 'ios') {
            const {...props} = this.props;
            const {inputHeight} = this.state;
            const newHeight = height > props.style.maxHeight ? inputHeight : height + 16;
            const transitionSpeed = height === 17 ? 500 : 100;

            Animated.timing(inputHeight, {
                toValue: newHeight,
                duration: transitionSpeed,
                easing: Easing.inOut(Easing.sin),
            }).start();
        }
    }

    render() {
        const {forwardRef, ...props} = this.props;
        const {inputHeight} = this.state;

        return (
            <ConditionalWrapper
                conditional={Platform.OS === 'ios'}
                wrapper={children => <Animated.View style={[{flex: 1, height: inputHeight}]}>{children}</Animated.View>}
            >
                <CustomTextInput
                    {...props}
                    ref={forwardRef}
                    onContentSizeChange={(e) => this.animateHeight(e.nativeEvent.contentSize.height)}
                />
            </ConditionalWrapper>
        );
    }
}

const WrappedPasteableTextInput = (props, ref) => (
    <PasteableTextInput
        {...props}
        forwardRef={ref}
    />
);

export default React.forwardRef(WrappedPasteableTextInput);
