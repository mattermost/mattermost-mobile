// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {Component} from 'react';
import {InteractionManager, Text, Keyboard} from 'react-native';
import PropTypes from 'prop-types';
import Search from 'react-native-search-box';

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
        blurOnSubmit: PropTypes.bool
    };

    constructor(props) {
        super(props);

        this.state = {
            placeholderWidth: 0
        };
    }

    shouldComponentUpdate(nextProps, nextState) {
        return nextState.placeholderWidth !== this.state.placeholderWidth;
    }

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
        return new Promise((resolve) => {
            Keyboard.dismiss();
            InteractionManager.runAfterInteractions(() => {
                if (this.props.onCancelButtonPress) {
                    this.props.onCancelButtonPress();
                }
                resolve();
            });
        });
    };

    onChangeText = (text) => {
        return new Promise((resolve) => {
            if (this.props.onChangeText) {
                this.props.onChangeText(text);
            }
            resolve();
        });
    };

    onDelete = () => {
        return new Promise((resolve) => {
            if (this.props.onChangeText) {
                this.props.onChangeText('');
            }
            resolve();
        });
    };

    onFocus = () => {
        return new Promise((resolve) => {
            if (this.props.onFocus) {
                this.props.onFocus();
            }
            resolve();
        });
    };

    onSearch = (text) => {
        return new Promise((resolve) => {
            if (this.props.onSearchButtonPress) {
                this.props.onSearchButtonPress(text);
            }
            resolve();
        });
    };

    render() {
        if (this.state.placeholderWidth) {
            return (
                <Search
                    {...this.props}
                    ref='search'
                    placeholderCollapsedMargin={this.state.placeholderWidth - 15}
                    placeholderExpandedMargin={30}
                    searchIconCollapsedMargin={this.state.placeholderWidth}
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

        return (
            <Text
                style={{position: 'absolute', top: -3000, left: -1000}}
                onLayout={(event) => {
                    const placeholderWidth = (event.nativeEvent.layout.width / 2);
                    this.setState({placeholderWidth});
                }}
            >
                {this.props.placeholder}
            </Text>
        );
    }
}
