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

import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
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
        onSearchButtonPress: PropTypes.func,
        onChangeText: PropTypes.func,
        onCancelButtonPress: PropTypes.func,
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
        returnKeyType: PropTypes.string,
        keyboardType: PropTypes.string,
        autoCapitalize: PropTypes.string,
        inputHeight: PropTypes.number,
        editable: PropTypes.bool,
        blurOnSubmit: PropTypes.bool,
        keyboardShouldPersist: PropTypes.bool,
        value: PropTypes.string,
        keyboardAppearance: PropTypes.string,
        showArrow: PropTypes.bool,
        searchBarRightMargin: PropTypes.number,
        leftComponent: PropTypes.element,
        searchIconSize: PropTypes.number,
        backArrowSize: PropTypes.number,
        deleteIconSize: PropTypes.number,
    };

    static defaultProps = {
        onSelectionChange: () => true,
        onBlur: () => true,
        editable: true,
        blurOnSubmit: false,
        keyboardShouldPersist: false,
        placeholderTextColor: 'grey',
        value: '',
        showArrow: false,
        searchIconSize: 24,
        backArrowSize: 24,
        deleteIconSize: 20,
        searchBarRightMargin: 0,
    };

    constructor(props) {
        super(props);

        this.state = {
            leftComponentWidth: 0,
        };

        this.iconDeleteAnimated = new Animated.Value(1);
        this.leftComponentAnimated = new Animated.Value(0);
        this.searchContainerAnimated = new Animated.Value(0);

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

    onBlur = async () => {
        if (this.props.leftComponent) {
            await this.collapseAnimation();
        }
        this.props.onBlur();
    };

    onLeftComponentLayout = (event) => {
        const leftComponentWidth = event.nativeEvent.layout.width;
        this.setState({leftComponentWidth});
    };

    onSearch = async () => {
        if (this.props.keyboardShouldPersist === false) {
            await Keyboard.dismiss();
        }

        this.props.onSearchButtonPress(this.props.value);
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
        InteractionManager.runAfterInteractions(async () => {
            if (this.props.leftComponent) {
                await this.expandAnimation();
            }

            if (this.props.onFocus) {
                this.props.onFocus();
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

        this.props.onChangeText('', true);
    };

    onCancel = () => {
        Keyboard.dismiss();
        InteractionManager.runAfterInteractions(() => {
            if (this.props.onCancelButtonPress) {
                this.props.onCancelButtonPress();
            }
        });
    };

    onSelectionChange = (event) => {
        this.props.onSelectionChange(event);
    };

    expandAnimation = () => {
        return new Promise((resolve) => {
            Animated.parallel([
                Animated.timing(
                    this.leftComponentAnimated,
                    {
                        toValue: 100,
                        duration: 200,
                    },
                ),
                Animated.timing(
                    this.searchContainerAnimated,
                    {
                        toValue: this.state.leftComponentWidth * -1,
                        duration: 200,
                    },
                ),
            ]).start();
            resolve();
        });
    }

    collapseAnimation = () => {
        return new Promise((resolve) => {
            Animated.parallel([
                Animated.timing(
                    this.leftComponentAnimated,
                    {
                        toValue: 0,
                        duration: 200,
                    },
                ),
                Animated.timing(
                    this.searchContainerAnimated,
                    {
                        toValue: 0,
                        duration: 200,
                    },
                ),
            ]).start();
            resolve();
        });
    }

    render() {
        const {backgroundColor, ...restOfInputPropStyles} = this.props.inputStyle;

        let clearIcon = null;
        let searchIcon = null;
        let cancelIcon = null;

        if (Platform.OS === 'ios') {
            clearIcon = (
                <TouchableWithoutFeedback
                    onPress={this.onDelete}
                >
                    <View style={[styles.iconDelete, this.props.inputHeight && {height: this.props.inputHeight}]}>
                        <AnimatedIonIcon
                            name='ios-close-circle'
                            size={17}
                            style={[
                                styles.defaultColor,
                                this.props.tintColorDelete && {color: this.props.tintColorDelete},
                                {
                                    opacity: this.iconDeleteAnimated,
                                },
                            ]}
                        />
                    </View>
                </TouchableWithoutFeedback>
            );

            searchIcon = (
                <EvilIcon
                    name='search'
                    size={24}
                    style={[
                        styles.fullWidth,
                        this.props.tintColorSearch && {color: this.props.tintColorSearch},
                        {
                            top: middleHeight - 10,
                        },
                    ]}
                />
            );
        } else {
            searchIcon = this.props.showArrow ?
                (
                    <TouchableWithoutFeedback onPress={this.onCancel}>
                        <MaterialIcon
                            name='arrow-back'
                            size={this.props.backArrowSize}
                            color={this.props.titleCancelColor || this.props.placeholderTextColor}
                        />
                    </TouchableWithoutFeedback>
                ) :
                (
                    <MaterialIcon
                        name='search'
                        size={this.props.searchIconSize}
                        color={this.props.tintColorSearch || this.props.placeholderTextColor}
                    />
                );

            // Making sure the icon won't change depending on whether the input is in focus on Android devices
            cancelIcon = searchIcon;

            clearIcon = this.props.value.length > 0 ? (
                <TouchableWithoutFeedback onPress={this.onDelete}>
                    <MaterialIcon
                        style={[{paddingRight: 7}]}
                        name='close'
                        size={this.props.deleteIconSize}
                        color={this.props.titleCancelColor || this.props.placeholderTextColor}
                    />
                </TouchableWithoutFeedback>
            ) : null;
        }

        return (
            <View style={styles.container}>
                {((this.props.leftComponent) ?
                    <Animated.View
                        style={{
                            right: this.leftComponentAnimated,
                        }}
                        onLayout={this.onLeftComponentLayout}
                    >
                        {this.props.leftComponent}
                    </Animated.View> :
                    null
                )}
                <Animated.View
                    style={[
                        styles.fullWidth,
                        {
                            marginRight: this.props.searchBarRightMargin,
                            marginLeft: this.searchContainerAnimated,
                            height: Platform.select({
                                ios: this.props.inputHeight || containerHeight - 10,
                                android: this.props.inputHeight,
                            }),
                        },
                    ]}
                >
                    <SearchBar
                        ref={this.setInputKeywordRef}
                        containerStyle={{
                            ...styles.searchContainer,
                            ...styles.fullWidth,
                            backgroundColor: this.props.backgroundColor,
                        }}
                        inputContainerStyle={{
                            ...styles.inputContainer,
                            backgroundColor,
                            height: this.props.inputHeight,
                        }}
                        inputStyle={{
                            ...styles.text,
                            color: this.props.placeholderTextColor,
                            ...restOfInputPropStyles,
                            height: this.props.inputHeight,
                        }}
                        placeholder={this.placeholder}
                        placeholderTextColor={this.props.placeholderTextColor}
                        selectionColor={this.props.selectionColor}
                        autoCorrect={false}
                        blurOnSubmit={this.props.blurOnSubmit}
                        editable={this.props.editable}
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
                        onCancel={this.onCancel}
                        onSelectionChange={this.onSelectionChange}
                        underlineColorAndroid='transparent'
                        enablesReturnKeyAutomatically={true}
                        keyboardAppearance={this.props.keyboardAppearance}
                        autoFocus={this.props.autoFocus}
                        showCancel={true}
                        value={this.props.value}
                        platform={Platform.OS === 'ios' ? 'ios' : 'android'}
                        clearIcon={clearIcon}
                        searchIcon={searchIcon}
                        cancelIcon={cancelIcon}
                    />
                </Animated.View>
            </View>
        );
    }
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        alignItems: 'center',
        height: containerHeight,
    },
    defaultColor: {
        color: 'grey',
    },
    fullWidth: {
        flex: 1,
    },
    iconDelete: {
        justifyContent: 'center',
        position: 'relative',
        top: 1,
    },
    inputContainer: {
        borderRadius: Platform.select({
            ios: 6,
            android: 0,
        }),
    },
    searchContainer: {
        paddingTop: 0,
        paddingBottom: 0,
        marginLeft: 0,
    },
    text: {
        marginLeft: 10,
        fontSize: Platform.select({
            ios: 14,
            android: 15,
        }),
        color: '#fff',
    },
});
