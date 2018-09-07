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
//
// In addition to that, there's also an ugly hack to change the key on the TextInput
// when this is triggered because that same version made setNativeProps work inconsistently.
// See https://github.com/facebook/react-native/issues/18272 for more information on that.
export default class QuickTextInput extends React.PureComponent {
    static propTypes = {

        editable: PropTypes.bool,
        onChangeText: PropTypes.func,

        /**
         * The string value displayed in this input
         */
        value: PropTypes.string.isRequired,
        refocusInput: PropTypes.bool,
    };

    static defaultProps = {
        refocusInput: true,
        delayInputUpdate: false,
        editable: true,
        value: '',
    };

    constructor(props) {
        super(props);

        this.storedValue = props.value;

        this.state = {
            key: 0,
        };
    }

    componentDidMount() {
        this.updateInputFromProps();
    }

    UNSAFE_componentWillReceiveProps(nextProps) { // eslint-disable-line camelcase
        // This will force the base TextInput to re-render if the value is changing
        // from something other than the user typing in it. This does however cause
        // the TextInput to flicker when this happens.
        if (nextProps.value !== this.storedValue) {
            this.setState({
                key: this.state.key + 1,
            });
        }

        this.hadFocus = this.input.isFocused() && this.props.refocusInput;
    }

    componentDidUpdate(prevProps, prevState) {
        if (this.props.value !== this.storedValue || !this.props.editable) {
            this.updateInputFromProps();
        }

        if (prevState.key !== this.state.key && this.hadFocus) {
            this.input.focus();
        }
    }

    updateInputFromProps = () => {
        if (!this.input) {
            return;
        }

        this.input.setNativeProps({text: this.props.value});
        this.storedValue = this.props.value;
    }

    setNativeProps(nativeProps) {
        this.input.setNativeProps(nativeProps);
    }

    isFocused() {
        return this.input.isFocused();
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
                key={this.state.key}
                onChangeText={this.handleChangeText}
                ref={this.setInput}
            />
        );
    }
}
