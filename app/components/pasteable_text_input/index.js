// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import PropTypes from 'prop-types';
import {NativeEventEmitter, NativeModules, Platform, TextInput} from 'react-native';

import {PASTE_FILES} from '@constants/post_draft';
import EventEmitter from '@mm-redux/utils/event_emitter';

const {OnPasteEventManager} = NativeModules;
const OnPasteEventEmitter = new NativeEventEmitter(OnPasteEventManager);

export class PasteableTextInput extends React.PureComponent {
    static propTypes = {
        ...TextInput.PropTypes,
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
        let data = null;
        let error = null;

        if (Platform.OS === 'android') {
            const {nativeEvent} = event;
            data = nativeEvent.data;
            error = nativeEvent.error;
        } else {
            data = event;
        }

        EventEmitter.emit(PASTE_FILES, error, data);
    }

    render() {
        const {forwardRef, ...props} = this.props;

        return (
            <TextInput
                testID='post_input'
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
