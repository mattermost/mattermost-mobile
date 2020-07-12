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
        license: PropTypes.object,
        listData: PropTypes.array,
        style: PropTypes.object,
    };

    constructor(props) {
        super(props);
        this.state = {
            x: 0,
            y: 0,
            focused: false,
            ref: null,
            onSelect: props.onSelect,
            selected: false,
            selectedId: null,
            value: props.value,
        };
    }

    componentDidUpdate(prevProps) {
        if (prevProps.value !== this.props.value) {
            // eslint-disable-next-line react/no-did-update-set-state
            this.setState({value: this.props.value});
        }
    }

    onFocus = () => {
        this.setState({focused: true});
    };

    onBlur = () => {
        this.state.onSelect(this.props.value);
        this.setState({focused: false});
    };

    inputRef = (ref) => {
        this.setState({ref});
    };

    renderListItem = ({item, index}) => {
        const {selected, selectedId} = this.state;
        return (
            <PickListItem
                index={index}
                item={item}
                onSelect={this.handleItemSelect}
                selectedId={selectedId}
                selected={selected}
                onBlur={this.onBlur}
                onDelete={this.props.onDelete}
            />
        );
    };

    dropdownMenu = (listData, y) => {
        return (
            <View style={[styles.dropdownContainer, {top: y + 50}]}>
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

    handleItemSelect = (item, selectedId) => {
        this.setState({
            selected: true,
            selectedId,
        });
        this.state.onSelect(item);
        setTimeout(() => {
            this.onBlur();
        }, 1500);
    };

    render() {
        const {
            inputRef,
            containerStyle,
            style,
            listData,
            onFocus,
            onBlur,
            onChangeText,
            onSelect,
            onSubmitEditing,
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            onDelete,
            ...props
        } = this.props;
        const {y, focused, ref, value} = this.state;
        const serverHistoryExists = listData != null && listData.length > 0;
        // eslint-disable-next-line eqeqeq
        const searchTermExists = value != null && value != '';
        return (
            <View style={styles.mainContainer}>
                <View
                    onLayout={(event) => {
                        // eslint-disable-next-line no-shadow
                        const {x, y} = event.nativeEvent.layout;
                        this.setState({x, y});
                    }}
                    style={[
                        containerStyle,
                        styles.innerContainer,
                        focused && styles.textInputContainerFocused,
                    ]}
                >
                    <View style={styles.textInputContainer}>
                        <TextInput
                            ref={(reference) => {
                                // eslint-disable-next-line no-unused-expressions
                                inputRef && inputRef(reference);
                                this.inputRef(reference);
                            }}
                            style={[style, styles.textInput]}
                            {...props}
                            underlineColorAndroid='transparent'
                            onFocus={() => {
                                // eslint-disable-next-line no-unused-expressions
                                onFocus && onFocus();
                                this.onFocus();
                            }}
                            onBlur={() => {
                                // eslint-disable-next-line no-unused-expressions
                                onBlur && onBlur();
                                this.onBlur();
                            }}
                            onChangeText={onChangeText}
                            onSubmitEditing={() => {
                                onSelect(value);
                                onSubmitEditing();
                            }}
                            value={value}
                        />
                    </View>

                    <View style={styles.textInputButtonsContainer}>
                        {searchTermExists && (
                            <TouchableWithoutFeedback
                                onPress={() => {
                                    // eslint-disable-next-line no-unused-expressions
                                    ref && ref.clear();
                                    // eslint-disable-next-line no-unused-expressions
                                    onChangeText && onChangeText('');
                                }}
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
                                onPress={() => {
                                    // eslint-disable-next-line no-unused-expressions
                                    focused ? this.onBlur() : this.onFocus();
                                }}
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
    textInputContainer: {flex: 1},
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
        zIndex: 1,
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
