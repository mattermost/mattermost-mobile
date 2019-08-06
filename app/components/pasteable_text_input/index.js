// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';
import PropTypes from 'prop-types';
import {Platform, TextInput, NativeEventEmitter, NativeModules} from 'react-native';
import PasteableTextInputAndroid from './pasteable_text_input_android';

const {OnPasteEventManager} = NativeModules;
const OnPasteEventEmitter = new NativeEventEmitter(OnPasteEventManager);

class PasteableTextInput extends React.Component {
    static propTypes = {
        ...TextInput.PropTypes,
        onPaste: PropTypes.func,
        forwardRef: PropTypes.any,
    }

    componentDidMount() {
        this.subscription = OnPasteEventEmitter.addListener('onPaste', this.onPaste);
    }

    componentWillUnmount() {
        this.subscription.remove();
    }

    onPaste = (event) => {
        const {onPaste} = this.props;
        onPaste?.(event);
    }

    render() {
        const {forwardRef, ...props} = this.props;
        if (Platform.OS === 'android') {
            return (
                <PasteableTextInputAndroid
                    {...props}
                    ref={forwardRef}
                />
            );
        }

        return (
            <TextInput
                {...props}
                ref={forwardRef}
            />
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
