// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {
    Animated,
    InteractionManager,
    Keyboard,
    TouchableWithoutFeedback,
    StyleSheet,
    View,
    Platform,
} from 'react-native';

import EvilIcon from 'react-native-vector-icons/EvilIcons';
import IonIcon from 'react-native-vector-icons/Ionicons';
import {SearchBar} from 'react-native-elements';

import CustomPropTypes from 'app/constants/custom_prop_types';

const AnimatedIonIcon = Animated.createAnimatedComponent(IonIcon);
const containerHeight = 40;
const middleHeight = 20;

export default class Search extends Component {
    static propTypes = {
        onBlur: PropTypes.func,
        onFocus: PropTypes.func,
        onSearch: PropTypes.func,
        onChangeText: PropTypes.func,
        onCancel: PropTypes.func,
        onDelete: PropTypes.func,
        onSelectionChange: PropTypes.func,
        backgroundColor: PropTypes.string,
        placeholderTextColor: PropTypes.string,
        titleCancelColor: PropTypes.string,
        tintColorSearch: PropTypes.string,
        tintColorDelete: PropTypes.string,
        selectionColor: PropTypes.string,
        inputStyle: CustomPropTypes.Style,
        cancelButtonStyle: CustomPropTypes.Style,
        autoFocus: PropTypes.bool,
        placeholder: PropTypes.string,
        cancelTitle: PropTypes.oneOfType([
            PropTypes.string,
            PropTypes.object,
        ]),
        iconDelete: PropTypes.object,
        iconSearch: PropTypes.object,
        returnKeyType: PropTypes.string,
        keyboardType: PropTypes.string,
        autoCapitalize: PropTypes.string,
        inputHeight: PropTypes.number,
        inputBorderRadius: PropTypes.number,
        editable: PropTypes.bool,
        blurOnSubmit: PropTypes.bool,
        keyboardShouldPersist: PropTypes.bool,
        value: PropTypes.string,
        positionRightDelete: PropTypes.number,
        keyboardAppearance: PropTypes.string,
    };

    static defaultProps = {
        onSelectionChange: () => true,
        onBlur: () => true,
        editable: true,
        blurOnSubmit: false,
        keyboardShouldPersist: false,
        placeholderTextColor: 'grey',
        value: '',
    };

    constructor(props) {
        super(props);

        this.iconDeleteAnimated = new Animated.Value(0);
        this.placeholder = this.props.placeholder || 'Search';
        this.cancelTitle = this.props.cancelTitle || 'Cancel';
    }

    setSearchContainerRef = (ref) => {
        this.searchContainerRef = ref;
    }

    setInputKeywordRef = (ref) => {
        this.inputKeywordRef = ref;
    }

    blur = () => {
        this.inputKeywordRef.blur();
    };

    focus = () => {
        this.inputKeywordRef.focus();
    };

    onBlur = () => {
        this.props.onBlur();
    };

    onSearch = async () => {
        if (this.props.keyboardShouldPersist === false) {
            await Keyboard.dismiss();
        }

        if (this.props.onSearch) {
            this.props.onSearch(this.props.value);
        }
    };

    onChangeText = (text) => {
        Animated.timing(
            this.iconDeleteAnimated,
            {
                toValue: (text.length > 0) ? 1 : 0,
                duration: 200,
                useNativeDriver: true,
            },
        ).start();

        if (this.props.onChangeText) {
            this.props.onChangeText(text);
        }
    };

    onFocus = () => {
        InteractionManager.runAfterInteractions(() => {
            if (this.props.onFocus) {
                this.props.onFocus(this.props.value);
            }
        });
    };

    onDelete = () => {
        Animated.timing(
            this.iconDeleteAnimated,
            {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            },
        ).start();
        this.focus();

        if (this.props.onDelete) {
            this.props.onDelete();
        }
    };

    onCancel = () => {
        if (this.props.onCancel) {
            this.props.onCancel();
        }
    };

    onSelectionChange = (event) => {
        this.props.onSelectionChange(event);
    };

    render() {
        const {backgroundColor} = this.props.inputStyle;

        const clearIcon = (
            <TouchableWithoutFeedback
                onPress={this.onDelete}
            >
                {((this.props.iconDelete) ?
                    <Animated.View
                        style={[
                            styles.iconDelete,
                            this.props.positionRightDelete && {right: this.props.positionRightDelete},
                            {opacity: this.iconDeleteAnimated},
                        ]}
                    >
                        {this.props.iconDelete}
                    </Animated.View> :
                    <View style={[styles.iconDelete, this.props.inputHeight && {height: this.props.inputHeight}]}>
                        <AnimatedIonIcon
                            name='ios-close-circle'
                            size={17}
                            style={[
                                styles.iconDeleteDefault,
                                this.props.tintColorDelete && {color: this.props.tintColorDelete},
                                this.props.positionRightDelete && {right: this.props.positionRightDelete},
                                {
                                    opacity: this.iconDeleteAnimated,
                                },
                            ]}
                        />
                    </View>
                )}
            </TouchableWithoutFeedback>
        );

        const searchIcon = this.props.iconSearch ?
            (
                <View
                    style={[
                        styles.iconSearch,
                        {left: this.iconSearchAnimated},
                    ]}
                >
                    {this.props.iconSearch}
                </View>
            ) :
            (
                <EvilIcon
                    name='search'
                    size={24}
                    style={[
                        styles.iconSearch,
                        this.props.tintColorSearch && {color: this.props.tintColorSearch},
                        {
                            top: middleHeight - 10,
                        },
                    ]}
                />
            );

        return (
            <View style={styles.container}>
                <SearchBar
                    ref={this.setInputKeywordRef}
                    containerStyle={{
                        backgroundColor: this.props.backgroundColor,
                        height: containerHeight - 10,
                    }}
                    inputContainerStyle={{
                        backgroundColor,
                        borderRadius: this.props.inputBorderRadius,
                    }}
                    inputStyle={{
                        ...styles.text,
                        color: this.props.placeholderTextColor,
                        height: this.props.inputHeight,
                    }}
                    placeholder={this.placeholder}
                    placeholderTextColor={this.props.placeholderTextColor}
                    selectionColor={this.props.selectionColor}
                    onSelectionChange={this.onSelectionChange}
                    autoCorrect={false}
                    blurOnSubmit={this.props.blurOnSubmit}
                    editable={this.props.editable}
                    onCancel={this.onCancel}
                    cancelButtonTitle={this.cancelTitle}
                    cancelButtonProps={{
                        buttonStyle: {
                            minWidth: 75,
                        },
                        buttonTextStyle: {
                            ...styles.text,
                            ...this.props.cancelButtonStyle,
                            color: this.props.titleCancelColor,
                        },
                    }}
                    onChangeText={this.onChangeText}
                    onSubmitEditing={this.onSearch}
                    returnKeyType={this.props.returnKeyType || 'search'}
                    keyboardType={this.props.keyboardType || 'default'}
                    autoCapitalize={this.props.autoCapitalize}
                    onBlur={this.onBlur}
                    onFocus={this.onFocus}
                    underlineColorAndroid='transparent'
                    enablesReturnKeyAutomatically={true}
                    keyboardAppearance={this.props.keyboardAppearance}
                    autoFocus={this.props.autoFocus}
                    showCancel={true}
                    value={this.props.value}
                    platform={Platform.OS === 'ios' ? 'ios' : 'android'}
                    searchIcon={searchIcon}
                    clearIcon={clearIcon}
                />
            </View>
        );
    }
}

const styles = StyleSheet.create({
    container: {
        height: containerHeight,
        justifyContent: 'center',
    },
    iconSearch: {
        flex: 1,
    },
    iconSearchDefault: {
        color: 'grey',
    },
    iconDelete: {
        alignItems: 'flex-start',
        justifyContent: 'center',
        position: 'relative',
        top: containerHeight - 39,
    },
    iconDeleteDefault: {
        color: 'grey',
    },
    text: {
        fontSize: 14,
        color: '#fff',
    },
});
