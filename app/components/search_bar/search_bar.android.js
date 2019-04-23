// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    InteractionManager,
    Keyboard,
    TextInput,
    TouchableWithoutFeedback,
    StyleSheet,
    View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

import CustomPropTypes from 'app/constants/custom_prop_types';
import {changeOpacity} from 'app/utils/theme';

export default class SearchBarAndroid extends PureComponent {
    static propTypes = {
        autoFocus: PropTypes.bool,
        backArrowSize: PropTypes.number,
        deleteIconSize: PropTypes.number,
        searchIconSize: PropTypes.number,
        onCancelButtonPress: PropTypes.func,
        onChangeText: PropTypes.func,
        onFocus: PropTypes.func,
        onBlur: PropTypes.func,
        onSearchButtonPress: PropTypes.func,
        onSelectionChange: PropTypes.func,
        backgroundColor: PropTypes.string,
        selectionColor: PropTypes.string,
        placeholderTextColor: PropTypes.string,
        titleCancelColor: PropTypes.string,
        tintColorSearch: PropTypes.string,
        tintColorDelete: PropTypes.string,
        inputStyle: CustomPropTypes.Style,
        placeholder: PropTypes.string,
        returnKeyType: PropTypes.string,
        keyboardType: PropTypes.string,
        autoCapitalize: PropTypes.string,
        inputHeight: PropTypes.number,
        inputBorderRadius: PropTypes.number,
        blurOnSubmit: PropTypes.bool,
        showArrow: PropTypes.bool,
        value: PropTypes.string,
        containerStyle: CustomPropTypes.Style,
        leftComponent: PropTypes.element,
    };

    static defaultProps = {
        backArrowSize: 24,
        deleteIconSize: 20,
        searchIconSize: 24,
        blurOnSubmit: true,
        placeholder: 'Search',
        showCancelButton: true,
        showArrow: true,
        placeholderTextColor: changeOpacity('#000', 0.5),
        containerStyle: {},
        onSearchButtonPress: () => true,
        onCancelButtonPress: () => true,
        onChangeText: () => true,
        onFocus: () => true,
        onBlur: () => true,
        onSelectionChange: () => true,
        value: '',
        leftComponent: null,
    };

    constructor(props) {
        super(props);
        this.state = {
            isFocused: false,
            refocusInput: true,
        };
    }

    cancel = () => {
        this.onCancelButtonPress();
    };

    onBlur = () => {
        this.props.onBlur();
    };

    onSearchButtonPress = () => {
        const {value} = this.props;
        this.setState({refocusInput: false}, () => {
            if (value) {
                this.props.onSearchButtonPress(value);
            }
            this.setState({refocusInput: true});
        });
    };

    onCancelButtonPress = () => {
        Keyboard.dismiss();
        InteractionManager.runAfterInteractions(() => {
            this.setState({
                isFocused: false,
            }, () => {
                this.props.onCancelButtonPress();
            });
        });
    };

    onClearPress = () => {
        this.onChangeText('');
    };

    onChangeText = (value) => {
        this.props.onChangeText(value);
    };

    onSelectionChange = (event) => {
        this.props.onSelectionChange(event);
    };

    onFocus = () => {
        this.setState({isFocused: true});
        this.props.onFocus();
    };

    blur = () => {
        this.refs.input.blur();
    };

    focus = () => {
        this.refs.input.focus();
    };

    render() {
        const {
            autoCapitalize,
            backArrowSize,
            deleteIconSize,
            searchIconSize,
            backgroundColor,
            blurOnSubmit,
            inputHeight,
            inputStyle,
            keyboardType,
            placeholder,
            placeholderTextColor,
            selectionColor,
            returnKeyType,
            titleCancelColor,
            tintColorDelete,
            tintColorSearch,
            containerStyle,
            value,
            showArrow,
        } = this.props;
        const {isFocused} = this.state;

        const {
            backgroundColor: bgColor, //eslint-disable-line no-unused-vars
            ...otherStyles
        } = inputStyle;

        const inputNoBackground = otherStyles;

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
                    containerStyle,
                    {height: inputHeight},
                    backgroundColor && {backgroundColor},
                ]}
            >
                {!isFocused && this.props.leftComponent}
                <View
                    style={[
                        styles.searchBar,
                        {
                            backgroundColor: inputColor,
                            height: inputHeight,
                            paddingLeft: 7,
                        },
                    ]}
                >
                    {isFocused && showArrow ?
                        <TouchableWithoutFeedback
                            onPress={this.onCancelButtonPress}
                            style={{paddingRight: 15}}
                        >
                            <Icon
                                name='arrow-back'
                                size={backArrowSize}
                                color={titleCancelColor || placeholderTextColor}
                            />
                        </TouchableWithoutFeedback> :
                        <Icon
                            name={'search'}
                            size={searchIconSize}
                            color={tintColorSearch || placeholderTextColor}
                        />
                    }
                    <TextInput
                        ref='input'
                        blurOnSubmit={blurOnSubmit}
                        refocusInput={this.state.refocusInput}
                        value={this.props.value}
                        autoCapitalize={autoCapitalize}
                        autoCorrect={false}
                        returnKeyType={returnKeyType || 'search'}
                        keyboardType={keyboardType || 'default'}
                        onFocus={this.onFocus}
                        onBlur={this.onBlur}
                        onChangeText={this.onChangeText}
                        onSubmitEditing={this.onSearchButtonPress}
                        onSelectionChange={this.onSelectionChange}
                        placeholder={placeholder}
                        placeholderTextColor={placeholderTextColor}
                        selectionColor={selectionColor}
                        underlineColorAndroid='transparent'
                        disableFullscreenUI={true}
                        style={[
                            styles.searchBarInput,
                            inputNoBackground,
                        ]}
                    />
                    {isFocused && value ?
                        <TouchableWithoutFeedback onPress={this.onClearPress}>
                            <Icon
                                style={[{paddingRight: 7}]}
                                name='close'
                                size={deleteIconSize}
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
    },
    searchBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    searchBarInput: {
        flex: 1,
        fontWeight: 'normal',
        textAlignVertical: 'center',
        fontSize: 15,
        includeFontPadding: true,
    },
    searchBarBlurredInput: {
        padding: 0,
    },
});
