// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import PropTypes from 'prop-types';
import {NativeEventEmitter, NativeModules, Platform, TextInput} from 'react-native';

const {OnPasteEventManager} = NativeModules;
const OnPasteEventEmitter = new NativeEventEmitter(OnPasteEventManager);

export class PasteableTextInput extends React.PureComponent {
    static propTypes = {
        ...TextInput.PropTypes,
        onPaste: PropTypes.func,
        forwardRef: PropTypes.any,
    }

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
        let data = null;
        let error = null;

        if (Platform.OS === 'android') {
            const {nativeEvent} = event;
            data = nativeEvent.data;
            error = nativeEvent.error;
        } else {
            data = event;
        }

        return onPaste?.(error, data);
    }

    render() {
        const {forwardRef, ...props} = this.props;

        return (
            <TextInput
                {...props}
                onPaste={this.onPaste}
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
