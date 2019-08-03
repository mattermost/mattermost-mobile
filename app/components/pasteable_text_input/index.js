// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';
import {TextInput} from 'react-native';

class PasteableTextInput extends React.Component {
    onChange = (event) => {
        const {nativeEvent} = event;
        const {image} = nativeEvent;
        const {onPaste, onChange} = this.props;
        if (image) {
            return onPaste?.(image);
        }

        return onChange?.(event);
    }

    render() {
        const {forwardRef, ...props} = this.props;
        return (
            <TextInput
                {...props}
                ref={forwardRef}
                onChange={this.onChange}
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
