// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import PropTypes from 'prop-types';
import React from 'react';
import {TextInput} from 'react-native';

// A component that can be used to make partially-controlled inputs that can be updated
// by changing the value prop without lagging the UI.
//
// We're using this in place of a connected TextInput due to changes made in RN v0.54
// that break input in Chinese and Japanese when using a connected TextInput. See
// https://github.com/facebook/react-native/issues/18403 for more information.
export default class QuickTextInput extends React.PureComponent {
    static propTypes = {

        onChangeText: PropTypes.func,

        /**
         * The string value displayed in this input
         */
        value: PropTypes.string.isRequired,
    };

    static defaultProps = {
        delayInputUpdate: false,
        value: '',
    };

    constructor(props) {
        super(props);

        this.storedValue = props.value;
    }

    componentDidMount() {
        this.updateInputFromProps();
    }

    componentDidUpdate() {
        if (this.props.value !== this.storedValue) {
            this.updateInputFromProps();
        }
    }

    updateInputFromProps = () => {
        if (!this.input) {
            return;
        }

        this.input.setNativeProps({text: this.props.value});
        this.storedValue = this.props.value;
    }

    focus() {
        this.input.focus();
    }

    blur() {
        this.input.blur();
    }

    handleChangeText = (value) => {
        this.storedValue = value;

        if (this.props.onChangeText) {
            this.props.onChangeText(value);
        }
    }

    setInput = (input) => {
        this.input = input;
    }

    render() {
        const props = {...this.props};

        // Specifying a value or defaultValue cause the issues noted above
        Reflect.deleteProperty(props, 'value');
        Reflect.deleteProperty(props, 'defaultValue');

        return (
            <TextInput
                {...props}
                onChangeText={this.handleChangeText}
                ref={this.setInput}
            />
        );
    }
}
