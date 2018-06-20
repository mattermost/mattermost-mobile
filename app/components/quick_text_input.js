// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import PropTypes from 'prop-types';
import React from 'react';
import {TextInput} from 'react-native';

// A component that can be used to make partially-controlled inputs that can be updated
// by changing the value prop without lagging the UI
export default class QuickTextInput extends React.PureComponent {
    static propTypes = {

        /**
         * Whether to delay updating the value of the textbox from props. Should only be used
         * on textboxes that require it to properly compose CJK characters as the user types.
         */
        delayInputUpdate: PropTypes.bool,

        /**
         * The string value displayed in this input
         */
        value: PropTypes.string.isRequired,
    };

    static defaultProps = {
        delayInputUpdate: false,
        value: '',
    };

    componentDidUpdate(prevProps) {
        if (prevProps.value !== this.props.value) {
            if (this.props.delayInputUpdate) {
                requestAnimationFrame(this.updateInputFromProps);
            } else {
                this.updateInputFromProps();
            }
        }
    }

    updateInputFromProps = () => {
        if (!this.input) {
            return;
        }

        this.input.setNativeProps({text: this.props.value});
    }

    get value() {
        return this.input.value;
    }

    set value(value) {
        this.input.setNativeProps({text: this.props.value});
    }

    focus() {
        this.input.focus();
    }

    blur() {
        this.input.blur();
    }

    getInput = () => {
        return this.input;
    };

    setInput = (input) => {
        this.input = input;
    }

    render() {
        const {value, ...props} = this.props;

        Reflect.deleteProperty(props, 'delayInputUpdate');

        // Only set the defaultValue since the real one will be updated using componentDidUpdate if necessary
        return (
            <TextInput
                {...props}
                ref={this.setInput}
                defaultValue={value}
            />
        );
    }
}
