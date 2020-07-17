// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';

import {
    TouchableWithoutFeedback,
    StyleSheet,
    View,
    TextInput,
    FlatList,
    Text,
    Platform,
} from 'react-native';
import {Icon} from 'react-native-elements';
import PickListItem from './picklistitem';
export default class TextInputPickList extends PureComponent {
    static propTypes = {
        inputRef: PropTypes.func,
        value: PropTypes.string,
        editable: PropTypes.bool,
        onChangeText: PropTypes.func.isRequired,
        onSelect: PropTypes.func.isRequired,
        onDelete: PropTypes.func.isRequired,
        onFocus: PropTypes.func,
        onBlur: PropTypes.func,
        onSubmitEditing: PropTypes.func.isRequired,
        containerStyle: PropTypes.object,
        listData: PropTypes.array,
        style: PropTypes.object,
        autoCapitalize: PropTypes.string,
        autoCorrect: PropTypes.bool,
        keyboardType: PropTypes.string,
        placeholder: PropTypes.any,
        placeholderTextColor: PropTypes.any,
        returnKeyType: PropTypes.string,
        underlineColorAndroid: PropTypes.string,
        disableFullscreenUI: PropTypes.bool,

    };

    constructor(props) {
        super(props);
        this.state = {
            x: 0,
            y: 0,
            focused: false,
            ref: null,
            onSelect: props.onSelect,
            selected: null,
            value: props.value,
        };
    }

    static getDerivedStateFromProps(props, state) {
        if (props.value !== state.value) {
            return {
                ...state,
                value: props.value,
            };
        }
        return state;
    }
    inputRef = (reference) => {
        if (this.props.inputRef) {
            this.props.inputRef(reference);
        }
        this.setState({ref: reference});
    };

    onFocus = () => {
        if (this.props.onFocus) {
            this.props.onFocus();
        }
        this.setState({focused: true});
    };

    onBlur = () => {
        if (this.props.onBlur) {
            this.props.onBlur();
        }
        this.state.onSelect(this.props.value);
        this.setState({focused: false});
    };

    onSubmitEditing = () => {
        this.props.onSelect(this.props.value);
        this.props.onSubmitEditing();
    };

    renderListItem = ({item, index}) => {
        const {selected} = this.state;
        return (
            <PickListItem
                key={index}
                index={index}
                item={item}
                onSelect={this.handleItemSelect}
                selected={selected}
                onDelete={this.props.onDelete}
            />
        );
    };

    dropdownMenu = (listData, y) => {
        return (
            <View
                style={[
                    styles.dropdownContainer,
                    {top: y + 50},
                    Platform.OS === 'android' && {zIndex: 1},
                ]}
            >
                <FlatList
                    keyboardShouldPersistTaps={'handled'}
                    ListHeaderComponent={
                        <Text style={styles.dropDownHeader}>
                            {'RECENT SERVERS'}
                        </Text>
                    }
                    data={listData}
                    renderItem={this.renderListItem}
                    keyExtractor={({index}) => index}
                />
            </View>
        );
    };

    handleItemSelect = (item) => {
        this.setState({
            selected: item,
        });
        this.state.onSelect(item);
        setTimeout(() => {
            this.onBlur();
        }, 1500);
    };

    filteredServerHistory = () => {
        const serverHistory = this.props.listData;
        const {value, selected} = this.state;
        if (selected) {
            return serverHistory;
        }
        const ret = serverHistory.filter((url) => url.includes(value));
        return ret;
    };

    clearTextInput=() => {
        if (this.state.ref) {
            this.state.ref.clear();
        }
        this.setState({selected: null});

        if (this.props.onChangeText) {
            this.props.onChangeText('');
        }
    }

    toggleDropDown=() => {
        if (this.state.focused) {
            this.onBlur();
        } else {
            this.onFocus();
        }
    }

    textInputOnLayout=(event) => {
        const {x, y} = event.nativeEvent.layout;
        this.setState({x, y});
    }

    render() {
        const {
            editable,
            onChangeText,
            containerStyle,
            style,
            autoCapitalize,
            autoCorrect,
            keyboardType,
            placeholder,
            placeholderTextColor,
            returnKeyType,
            underlineColorAndroid,
            disableFullscreenUI,

        } = this.props;
        const listData = this.filteredServerHistory();

        const {y, focused, value} = this.state;
        const serverHistoryExists = listData != null && listData.length > 0;
        const searchTermExists = value != null && value !== '';
        return (
            <View
                style={[
                    styles.mainContainer,
                    Platform.OS === 'ios' && {zIndex: 1},
                ]}
            >
                <View
                    onLayout={this.textInputOnLayout}
                    style={[
                        containerStyle,
                        styles.innerContainer,
                        focused && styles.textInputContainerFocused,
                    ]}
                >
                    <View style={styles.textInputContainer}>
                        <TextInput
                            ref={this.inputRef}
                            style={[style, styles.textInput]}
                            onFocus={this.onFocus}
                            onBlur={this.onBlur}
                            onChangeText={onChangeText}
                            onSubmitEditing={this.onSubmitEditing}
                            value={value}
                            editable={editable}
                            autoCapitalize={autoCapitalize}
                            autoCorrect={autoCorrect}
                            keyboardType={keyboardType}
                            placeholder={placeholder}
                            placeholderTextColor={placeholderTextColor}
                            returnKeyType={returnKeyType}
                            underlineColorAndroid={underlineColorAndroid}
                            disableFullscreenUI={disableFullscreenUI}
                        />
                    </View>

                    <View style={styles.textInputButtonsContainer}>
                        {searchTermExists && (
                            <TouchableWithoutFeedback
                                onPress={this.clearTextInput}
                            >
                                <Icon
                                    name='cancel'
                                    type='material'
                                    color='#3d3c40a3'
                                    size={20}
                                    containerStyle={{
                                        height: '100%',
                                        padding: 4,
                                        justifyContent: 'center',
                                    }}
                                />
                            </TouchableWithoutFeedback>
                        )}
                        {serverHistoryExists && (
                            <TouchableWithoutFeedback
                                onPress={this.toggleDropDown}
                            >
                                <Icon
                                    name='chevron-down'
                                    type='feather'
                                    color='black'
                                    size={22}
                                    containerStyle={styles.chevronConteiner}
                                />
                            </TouchableWithoutFeedback>
                        )}
                    </View>
                </View>
                {serverHistoryExists &&
                    focused &&
                    this.dropdownMenu(listData, y)}
            </View>
        );
    }
}

const styles = StyleSheet.create({
    mainContainer: {width: '100%'},
    innerContainer: {flexDirection: 'row'},
    textInputContainer: {flex: 1, justifyContent: 'center'},
    textInputContainerFocused: {borderColor: '#166DE0', borderWidth: 2},
    textInput: {width: '100%', marginRight: 10},
    textInputButtonsContainer: {
        flexDirection: 'row',
        height: '100%',
    },
    chevronConteiner: {
        height: '100%',
        aspectRatio: 1,
        borderLeftColor: 'gainsboro',
        borderLeftWidth: 1,
        justifyContent: 'center',
    },
    dropdownContainer: {
        position: 'absolute',
        height: 125,
        width: '100%',
        backgroundColor: 'white',
        borderColor: 'gainsboro',
        borderWidth: 1,
        borderRadius: 3,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 3,
    },
    dropDownHeader: {
        fontSize: 12,
        fontWeight: '400',
        opacity: 0.84,
        padding: 5,
    },
});
