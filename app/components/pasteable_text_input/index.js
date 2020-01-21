// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import PropTypes from 'prop-types';
import {Animated, Easing, NativeEventEmitter, NativeModules, Platform, TextInput} from 'react-native';
import CustomTextInput from './custom_text_input';
import {ConditionalWrapper} from 'app/components/conditionalWrapper';
import {ViewTypes} from 'app/constants';

const {OnPasteEventManager} = NativeModules;
const OnPasteEventEmitter = new NativeEventEmitter(OnPasteEventManager);

export class PasteableTextInput extends React.PureComponent {
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

    animateHeight = (event) => {
        if (Platform.OS === 'ios') {
            const {height} = event.nativeEvent.contentSize;
            const {style} = this.props;
            const {inputHeight} = this.state;
            const newHeight = Math.min(style.maxHeight, height + ViewTypes.INPUT_VERTICAL_PADDING);
            const transitionSpeed = height === ViewTypes.INPUT_LINE_HEIGHT ? 500 : 1;

            Animated.timing(inputHeight, {
                toValue: newHeight,
                duration: transitionSpeed,
                easing: Easing.inOut(Easing.sin),
            }).start();
        }
    }

    wrapperLayout = (children) => {
        const {inputHeight} = this.state;
        return <Animated.View style={{flex: 1, height: inputHeight}}>{children}</Animated.View>;
    }

    render() {
        const {forwardRef, ...props} = this.props;

        return (
            <ConditionalWrapper
                conditional={Platform.OS === 'ios'}
                wrapper={this.wrapperLayout}
            >
                <CustomTextInput
                    {...props}
                    ref={forwardRef}
                    onContentSizeChange={this.animateHeight}
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
