// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import {IntlShape} from 'react-intl';
import {
    Animated,
    InteractionManager,
    Keyboard,
    StyleSheet,
    View,
    Platform,
    ViewStyle,
    ReturnKeyTypeOptions,
    KeyboardTypeOptions,
    NativeSyntheticEvent,
    TextInputSelectionChangeEventData,
    TextStyle,
} from 'react-native';
import {SearchBar} from 'react-native-elements';

import CompassIcon from '@components/compass_icon';

import ClearIcon from './components/clear_icon';
import SearchIcon from './components/search_icon';
import {getSearchStyles} from './styles';

const LEFT_COMPONENT_INITIAL_POSITION = Platform.OS === 'ios' ? 7 : 0;

type SearchProps = {
    autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters' | undefined;
    autoFocus?: boolean;
    backArrowSize?: number;
    backgroundColor: string;
    blurOnSubmit?: boolean;
    cancelButtonStyle?: ViewStyle;
    cancelTitle?: string;
    containerHeight?: number;
    containerStyle?: ViewStyle;
    deleteIconSize?: number;
    editable?: boolean;
    inputHeight: number;
    inputStyle?: TextStyle;
    intl?: IntlShape;
    keyboardAppearance?: 'default' | 'light' | 'dark' | undefined;
    keyboardShouldPersist?: boolean;
    keyboardType?: KeyboardTypeOptions | undefined;
    leftComponent?: JSX.Element;
    onBlur?: () => void;
    onCancelButtonPress: (text?: string) => void;
    onChangeText: (text: string) => void;
    onFocus?: () => void;
    onSearchButtonPress?: (value: string) => void;
    onSelectionChange?: (e: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => void;
    placeholder?: string;
    placeholderTextColor?: string;
    returnKeyType?: ReturnKeyTypeOptions | undefined;
    searchBarRightMargin?: number;
    searchIconSize?: number;
    selectionColor?: string;
    showArrow?: boolean;
    showCancel?: boolean;
    testID: string;
    tintColorDelete: string;
    tintColorSearch: string;
    titleCancelColor: string;
    value?: string;
};

type SearchState = {
    leftComponentWidth: number;
}

export default class Search extends PureComponent<SearchProps, SearchState> {
    static defaultProps = {
        backArrowSize: 24,
        blurOnSubmit: false,
        containerHeight: 40,
        deleteIconSize: 20,
        editable: true,
        keyboardShouldPersist: false,
        keyboardType: 'default',
        onBlur: () => true,
        onSelectionChange: () => true,
        placeholderTextColor: 'grey',
        returnKeyType: 'search',
        searchBarRightMargin: 0,
        searchIconSize: 24,
        showArrow: false,
        showCancel: true,
        value: '',
    };

    private readonly leftComponentAnimated: Animated.Value;
    private readonly searchContainerAnimated: Animated.Value;
    private searchContainerRef: any;
    private inputKeywordRef: any;
    private readonly searchStyle: any;

    constructor(props: SearchProps | Readonly<SearchProps>) {
        super(props);
        this.state = {
            leftComponentWidth: 0,
        };

        this.leftComponentAnimated = new Animated.Value(LEFT_COMPONENT_INITIAL_POSITION);
        this.searchContainerAnimated = new Animated.Value(0);

        const {backgroundColor, cancelButtonStyle, containerHeight, inputHeight, inputStyle, placeholderTextColor, searchBarRightMargin, tintColorDelete, tintColorSearch, titleCancelColor} = props;

        this.searchStyle = getSearchStyles(backgroundColor, cancelButtonStyle, containerHeight!, inputHeight, inputStyle, placeholderTextColor!, searchBarRightMargin!, tintColorDelete, tintColorSearch, titleCancelColor);
    }

    setSearchContainerRef = (ref: any) => {
        this.searchContainerRef = ref;
    };

    setInputKeywordRef = (ref: any) => {
        this.inputKeywordRef = ref;
    };

    blur = () => {
        this.inputKeywordRef.blur();
    };

    focus = () => {
        this.inputKeywordRef.focus();
    };

    onBlur = async () => {
        this.props?.onBlur?.();

        if (this.props.leftComponent) {
            await this.collapseAnimation();
        }
    };

    onLeftComponentLayout = (event: { nativeEvent: { layout: { width: any } } }) => {
        const leftComponentWidth = event.nativeEvent.layout.width;
        this.setState({leftComponentWidth});
    };

    onSearch = async () => {
        const {keyboardShouldPersist, onSearchButtonPress, value} = this.props;
        if (!keyboardShouldPersist) {
            await Keyboard.dismiss();
        }

        if (value) {
            onSearchButtonPress?.(value);
        }
    };

    onChangeText = (text: string) => {
        const {onChangeText} = this.props;
        if (onChangeText) {
            onChangeText(text);
        }
    };

    onFocus = () => {
        const {leftComponent, onFocus} = this.props;
        InteractionManager.runAfterInteractions(async () => {
            onFocus?.();
            if (leftComponent) {
                await this.expandAnimation();
            }
        });
    };

    onClear = () => {
        this.focus();
        this.props.onChangeText('');
    };

    onCancel = () => {
        const {onCancelButtonPress} = this.props;

        Keyboard.dismiss();
        InteractionManager.runAfterInteractions(() => {
            return onCancelButtonPress?.();
        });
    };

    onSelectionChange = (event: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => {
        const {onSelectionChange} = this.props;
        onSelectionChange?.(event);
    };

    expandAnimation = () => {
        return new Promise((resolve) => {
            Animated.parallel([
                Animated.timing(this.leftComponentAnimated, {toValue: -115, duration: 200} as Animated.TimingAnimationConfig),
                Animated.timing(this.searchContainerAnimated, {toValue: this.state.leftComponentWidth * -1, duration: 200} as Animated.TimingAnimationConfig),
            ]).start(resolve);
        });
    };

    collapseAnimation = () => {
        return new Promise((resolve) => {
            Animated.parallel([
                Animated.timing(this.leftComponentAnimated, {toValue: LEFT_COMPONENT_INITIAL_POSITION, duration: 200} as Animated.TimingAnimationConfig),
                Animated.timing(this.searchContainerAnimated, {toValue: 0, duration: 200} as Animated.TimingAnimationConfig),
            ]).start(resolve);
        });
    };

    render() {
        const {autoCapitalize, autoFocus, backArrowSize, blurOnSubmit, cancelTitle, deleteIconSize, editable, intl, keyboardAppearance, keyboardType, leftComponent, placeholder, placeholderTextColor, returnKeyType, searchIconSize, selectionColor, showArrow, showCancel, testID, tintColorDelete, tintColorSearch, titleCancelColor, value} = this.props;

        const searchClearButtonTestID = `${testID}.search.clear.button`;
        const searchCancelButtonTestID = `${testID}.search.cancel.button`;
        const searchInputTestID = `${testID}.search.input`;

        const {cancelButtonPropStyle, containerStyle, inputContainerStyle, inputTextStyle, searchBarStyle, styles} = this.searchStyle;

        return (
            <View
                testID={testID}
                style={[searchBarStyle.container, this.props.containerStyle]}
            >
                {leftComponent && (
                    <Animated.View
                        style={[styles.leftComponent, {left: this.leftComponentAnimated}]}
                        onLayout={this.onLeftComponentLayout}
                    >
                        {leftComponent}
                    </Animated.View>
                )}
                <Animated.View
                    style={[
                        styles.fullWidth,
                        searchBarStyle.searchBarWrapper,
                        {marginLeft: this.searchContainerAnimated},
                    ]}
                >
                    <SearchBar
                        testID={searchInputTestID}
                        autoCapitalize={autoCapitalize}
                        autoCorrect={false}
                        autoFocus={autoFocus}
                        blurOnSubmit={blurOnSubmit}
                        cancelButtonProps={cancelButtonPropStyle}
                        cancelButtonTitle={cancelTitle || intl?.formatMessage({id: 'mobile.post.cancel', defaultMessage: 'Cancel'}) || ''}
                        cancelIcon={

                            // Making sure the icon won't change depending on whether the input is in focus on Android devices
                            Platform.OS === 'android' && (
                                <CompassIcon
                                    testID={searchCancelButtonTestID}
                                    name='arrow-left'
                                    size={25}
                                    color={searchBarStyle.clearIconColorAndroid}
                                    onPress={this.onCancel}
                                />
                            )
                        }

                        // @ts-expect-error: The clearIcon can also accept a ReactElement
                        clearIcon={
                            <ClearIcon
                                deleteIconSizeAndroid={deleteIconSize!}
                                onClear={this.onClear}
                                placeholderTextColor={placeholderTextColor!}
                                searchClearButtonTestID={searchClearButtonTestID}
                                tintColorDelete={tintColorDelete}
                                titleCancelColor={titleCancelColor}
                            />
                        }
                        containerStyle={containerStyle}
                        disableFullscreenUI={true}
                        editable={editable}
                        enablesReturnKeyAutomatically={true}
                        inputContainerStyle={inputContainerStyle}
                        inputStyle={inputTextStyle}
                        keyboardAppearance={keyboardAppearance}
                        keyboardType={keyboardType}
                        leftIconContainerStyle={styles.leftIcon}
                        placeholder={placeholder || intl?.formatMessage({id: 'search_bar.search', defaultMessage: 'Search'}) || ''}
                        placeholderTextColor={placeholderTextColor}
                        platform={Platform.OS as 'ios' | 'android'}
                        onBlur={this.onBlur}
                        onCancel={this.onCancel}

                        // @ts-expect-error: The TS definition for this SearchBar is messed up
                        onChangeText={this.onChangeText}
                        onClear={this.onClear}
                        onFocus={this.onFocus}
                        onSelectionChange={this.onSelectionChange}
                        onSubmitEditing={this.onSearch}

                        // @ts-expect-error: The searchIcon can also accept a ReactElement
                        searchIcon={
                            <SearchIcon
                                searchIconColor={tintColorSearch || placeholderTextColor!}
                                searchIconSize={searchIconSize!}
                                clearIconColorAndroid={titleCancelColor || placeholderTextColor!}
                                backArrowSize={backArrowSize!}
                                searchCancelButtonTestID={searchCancelButtonTestID}
                                onCancel={this.onCancel}
                                showArrow={showArrow!}
                                iOSStyle={StyleSheet.flatten([styles.fullWidth, searchBarStyle.searchIcon])}
                            />
                        }
                        selectionColor={selectionColor}
                        showCancel={showCancel!}
                        ref={this.setInputKeywordRef}
                        returnKeyType={returnKeyType}
                        underlineColorAndroid='transparent'
                        value={value!}
                    />
                </Animated.View>
            </View>
        );
    }
}
