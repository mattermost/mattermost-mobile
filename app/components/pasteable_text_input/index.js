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

    inputHeight = new Animated.Value(ViewTypes.INPUT_INITIAL_HEIGHT);

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
            const {style, value} = this.props;
            const newHeight = Math.min(style.maxHeight, height + ViewTypes.INPUT_VERTICAL_PADDING);

            if (value) {
                this.inputHeight.setValue(newHeight);
            } else {
                requestAnimationFrame(() => {
                    Animated.timing(this.inputHeight, {
                        toValue: ViewTypes.INPUT_INITIAL_HEIGHT,
                        duration: 350,
                        delay: 100,
                        easing: Easing.inOut(Easing.sin),
                    }).start();
                });
            }
        }
    }

    wrapperLayout = (children) => {
        return (
            <Animated.View
                ref={this.containerRef}
                style={{height: this.inputHeight}}
            >
                {children}
            </Animated.View>
        );
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
