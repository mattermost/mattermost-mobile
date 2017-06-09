// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.
import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    InteractionManager,
    Keyboard,
    TextInput,
    StyleSheet,
    View,
    TouchableWithoutFeedback
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

import {changeOpacity} from 'app/utils/theme';

export default class SearchBarAndroid extends PureComponent {
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
        inputStyle: PropTypes.oneOfType([
            PropTypes.number,
            PropTypes.object
        ]),
        placeholder: PropTypes.string,
        returnKeyType: PropTypes.string,
        keyboardType: PropTypes.string,
        autoCapitalize: PropTypes.string,
        inputHeight: PropTypes.number,
        inputBorderRadius: PropTypes.number,
        blurOnSubmit: PropTypes.bool
    };

    static defaultProps = {
        blurOnSubmit: false,
        placeholder: 'Search',
        showCancelButton: true,
        placeholderTextColor: changeOpacity('#000', 0.5),
        onSearchButtonPress: () => true,
        onCancelButtonPress: () => true,
        onChangeText: () => true,
        onFocus: () => true
    };

    constructor(props) {
        super(props);
        this.state = {
            isFocused: false,
            value: ''
        };
    }

    cancel = () => {
        this.onCancelButtonPress();
    };

    onSearchButtonPress = () => {
        const {onSearchButtonPress} = this.props;
        const {value} = this.state;

        if (value && onSearchButtonPress) {
            onSearchButtonPress(value);
        }
    };

    onCancelButtonPress = () => {
        const {onCancelButtonPress} = this.props;

        Keyboard.dismiss();
        InteractionManager.runAfterInteractions(() => {
            this.setState({
                isFocused: false,
                value: ''
            }, () => {
                if (onCancelButtonPress) {
                    onCancelButtonPress();
                }
            });
        });
    };

    onChangeText = (value) => {
        const {onChangeText} = this.props;
        this.setState({value});
        if (onChangeText) {
            onChangeText(value);
        }
    };

    onFocus = () => {
        const {onFocus} = this.props;

        this.setState({isFocused: true});

        if (onFocus) {
            onFocus();
        }
    };

    render() {
        const {
            autoCapitalize,
            backgroundColor,
            blurOnSubmit,
            inputHeight,
            inputStyle,
            keyboardType,
            placeholder,
            placeholderTextColor,
            returnKeyType,
            titleCancelColor,
            tintColorDelete,
            tintColorSearch
        } = this.props;
        const {isFocused, value} = this.state;

        const inputNoBackground = {
            ...inputStyle
        };
        Reflect.deleteProperty(inputNoBackground, 'backgroundColor');

        let inputColor = styles.searchBarInput.backgroundColor;
        if (inputStyle) {
            inputColor = inputStyle.backgroundColor;
        } else {
            inputNoBackground.backgroundColor = '#fff';
        }

        return (
            <View
                style={[
                    styles.container,
                    {height: inputHeight},
                    backgroundColor && {backgroundColor}
                ]}
            >
                <View
                    style={[
                        styles.searchBar,
                        {
                            backgroundColor: inputColor,
                            height: inputHeight,
                            paddingLeft: inputHeight * 0.25
                        }
                    ]}
                >
                    {isFocused ?
                        <TouchableWithoutFeedback
                            onPress={this.onCancelButtonPress}
                            style={{paddingRight: 5}}
                        >
                            <Icon
                                name='arrow-back'
                                size={24}
                                color={titleCancelColor || placeholderTextColor}
                            />
                        </TouchableWithoutFeedback> :
                        <Icon
                            name={'search'}
                            size={16}
                            color={tintColorSearch || placeholderTextColor}
                        />
                    }
                    <TextInput
                        blurOnSubmit={blurOnSubmit}
                        value={value}
                        autoCapitalize={autoCapitalize}
                        autoCorrect={false}
                        returnKeyType={returnKeyType || 'search'}
                        keyboardType={keyboardType || 'default'}
                        onFocus={this.onFocus}
                        onChangeText={this.onChangeText}
                        onSubmitEditing={this.onSearchButtonPress}
                        placeholder={placeholder}
                        placeholderTextColor={placeholderTextColor}
                        underlineColorAndroid='transparent'
                        style={[
                            styles.searchBarInput,
                            inputNoBackground,
                            {height: this.props.inputHeight}
                        ]}
                    />
                    {isFocused && value ?
                        <TouchableWithoutFeedback onPress={() => this.onChangeText('')}>
                            <Icon
                                style={[{paddingRight: (inputHeight * 0.2)}]}
                                name='close'
                                size={16}
                                color={tintColorDelete || placeholderTextColor}
                            />
                        </TouchableWithoutFeedback> : null
                    }
                </View>
            </View>
        );
    }
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'grey',
        flexDirection: 'row',
        justifyContent: 'flex-start',
        alignItems: 'center',
        padding: 5
    },
    searchBar: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: 'red',
        alignItems: 'center'
    },
    searchBarInput: {
        flex: 1,
        fontWeight: 'normal',
        textAlignVertical: 'center',
        padding: 0,
        includeFontPadding: false
    }
});
