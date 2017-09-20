// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import {InteractionManager, Keyboard} from 'react-native';
import PropTypes from 'prop-types';
import Search from './search_box';

export default class SearchBarIos extends PureComponent {
    static propTypes = {
        onCancelButtonPress: PropTypes.func,
        onChangeText: PropTypes.func,
        onFocus: PropTypes.func,
        onBlur: PropTypes.func,
        onSearchButtonPress: PropTypes.func,
        onSelectionChange: PropTypes.func,
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

    static defaultProps = {
        onSearchButtonPress: () => true,
        onCancelButtonPress: () => true,
        onChangeText: () => true,
        onFocus: () => true,
        onBlur: () => true,
        onSelectionChange: () => true,
        blurOnSubmit: true
    };

    cancel = () => {
        this.refs.search.onCancel();
    };

    onBlur = () => {
        this.props.onBlur();
    };

    onCancel = () => {
        Keyboard.dismiss();
        InteractionManager.runAfterInteractions(() => {
            this.props.onCancelButtonPress();
        });
    };

    onChangeText = (text) => {
        this.props.onChangeText(text);
    };

    onDelete = () => {
        this.props.onChangeText('');
    };

    onFocus = () => {
        this.props.onFocus();
    };

    onSearch = (text) => {
        if (text) {
            this.props.onSearchButtonPress(text);
        }
    };

    onSelectionChange = (event) => {
        this.props.onSelectionChange(event);
    };

    blur = () => {
        this.refs.search.blur();
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
                onBlur={this.onBlur}
                onSearch={this.onSearch}
                onSelectionChange={this.onSelectionChange}
                onDelete={this.onDelete}
            />
        );
    }
}
