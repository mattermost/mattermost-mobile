// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {Component} from 'react';
import {InteractionManager, Keyboard} from 'react-native';
import PropTypes from 'prop-types';
import Search from './search_box';

export default class SearchBarIos extends Component {
    static propTypes = {
        onCancelButtonPress: PropTypes.func,
        onChangeText: PropTypes.func,
        onFocus: PropTypes.func,
        onSearchButtonPress: PropTypes.func,
        backgroundColor: PropTypes.string,
        placeholderTextColor: PropTypes.string,
        titleCancelColor: PropTypes.string,
        tintColorSearch: PropTypes.string,
        tintColorDelete: PropTypes.string,
        cancelButtonStyle: PropTypes.PropTypes.oneOfType([
            PropTypes.number,
            PropTypes.object
        ]),
        inputStyle: PropTypes.oneOfType([
            PropTypes.number,
            PropTypes.object
        ]),
        placeholder: PropTypes.string,
        cancelTitle: PropTypes.oneOfType([
            PropTypes.string,
            PropTypes.object
        ]),
        returnKeyType: PropTypes.string,
        keyboardType: PropTypes.string,
        autoCapitalize: PropTypes.string,
        inputHeight: PropTypes.number,
        inputBorderRadius: PropTypes.number,
        blurOnSubmit: PropTypes.bool,
        value: PropTypes.string
    };

    afterDelete = () => {
        return new Promise((resolve) => {
            this.refs.search.focus();
            resolve();
        });
    };

    cancel = () => {
        this.refs.search.onCancel();
    };

    onCancel = () => {
        Keyboard.dismiss();
        InteractionManager.runAfterInteractions(() => {
            if (this.props.onCancelButtonPress) {
                this.props.onCancelButtonPress();
            }
        });
    };

    onChangeText = (text) => {
        if (this.props.onChangeText) {
            this.props.onChangeText(text);
        }
    };

    onDelete = () => {
        if (this.props.onChangeText) {
            this.props.onChangeText('');
        }
    };

    onFocus = () => {
        if (this.props.onFocus) {
            this.props.onFocus();
        }
    };

    onSearch = (text) => {
        if (this.props.onSearchButtonPress) {
            this.props.onSearchButtonPress(text);
        }
    };

    focus = () => {
        this.refs.search.focus();
    };

    render() {
        return (
            <Search
                {...this.props}
                ref='search'
                placeholderCollapsedMargin={25}
                placeholderExpandedMargin={25}
                searchIconCollapsedMargin={15}
                searchIconExpandedMargin={15}
                shadowVisible={false}
                onCancel={this.onCancel}
                onChangeText={this.onChangeText}
                onFocus={this.onFocus}
                onSearch={this.onSearch}
                afterDelete={this.afterDelete}
                onDelete={this.onDelete}
            />
        );
    }
}
