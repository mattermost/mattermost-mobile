// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.
import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Keyboard,
    TextInput,
    StyleSheet,
    View,
    TouchableOpacity
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const styles = StyleSheet.create({
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'transparent',
        margin: 8
    },
    searchBarInput: {
        flex: 1,
        fontWeight: 'normal',
        backgroundColor: 'transparent'
    }
});

export default class SearchBarAndroid extends PureComponent {
    static propTypes = {
        height: PropTypes.number.isRequired,
        fontSize: PropTypes.number.isRequired,
        text: PropTypes.string,
        placeholder: PropTypes.string,
        showCancelButton: PropTypes.bool,
        textFieldBackgroundColor: PropTypes.string,
        placeholderTextColor: PropTypes.string,
        textColor: PropTypes.string,
        onChange: PropTypes.func,
        onChangeText: PropTypes.func,
        onFocus: PropTypes.func,
        onBlur: PropTypes.func,
        onSearchButtonPress: PropTypes.func,
        onCancelButtonPress: PropTypes.func
    };

    static defaultProps = {
        placeholder: 'Search',
        showCancelButton: true,
        placeholderTextColor: '#bdbdbd',
        textColor: '#212121',
        onSearchButtonPress: () => true,
        onCancelButtonPress: () => true,
        onChangeText: () => true,
        onFocus: () => true,
        onBlur: () => true
    };

    constructor(props) {
        super(props);
        this.state = {
            isOnFocus: false,
            value: this.props.text
        };
        this.onFocus = this.onFocus.bind(this);
        this.onBlur = this.onBlur.bind(this);
        this.onCancelButtonPress = this.onCancelButtonPress.bind(this);
        this.onSearchButtonPress = this.onSearchButtonPress.bind(this);
        this.onChangeText = this.onChangeText.bind(this);
    }

    onSearchButtonPress() {
        const onSearchButtonPress = this.props.onSearchButtonPress;
        if (this.state.value) {
            onSearchButtonPress(this.state.value);
        }
    }

    onCancelButtonPress() {
        const onCancelButtonPress = this.props.onCancelButtonPress;
        this.setState({
            isOnFocus: false,
            value: ''
        });

        onCancelButtonPress();
        Keyboard.dismiss();
    }

    onChangeText(value) {
        const onChangeText = this.props.onChangeText;
        this.setState({value});
        onChangeText(value);
    }

    onFocus() {
        const onFocus = this.props.onFocus;
        this.setState({isOnFocus: true});
        onFocus();
    }

    onBlur() {
        const onBlur = this.props.onBlur;
        this.setState({isOnFocus: false});
        onBlur();
        Keyboard.dismiss();
    }

    blur = () => {
        this.onBlur();
    };

    render() {
        const {
            height,
            placeholder,
            fontSize,
            placeholderTextColor,
            textColor,
            textFieldBackgroundColor
        } = this.props;

        const searchBarStyle = {
            height: height + 10,
            paddingLeft: height * 0.25,
            backgroundColor: textFieldBackgroundColor
        };

        const inputStyle = {
            paddingLeft: height * 0.5,
            fontSize,
            color: textColor
        };

        return (
            <View
                style={[styles.searchBar, searchBarStyle]}
            >
                {this.state.isOnFocus && this.props.showCancelButton ?
                    <TouchableOpacity onPress={this.onCancelButtonPress}>
                        <Icon
                            name='arrow-back'
                            size={height}
                            color={placeholderTextColor}
                        />
                    </TouchableOpacity> :
                    <Icon
                        name={'search'}
                        size={height}
                        color={placeholderTextColor}
                    />
                }
                <TextInput
                    value={this.state.value}
                    returnKeyType='search'
                    onFocus={this.onFocus}
                    onBlur={this.onBlur}
                    onChange={this.props.onChange}
                    onChangeText={this.onChangeText}
                    onSubmitEditing={this.onSearchButtonPress}
                    placeholder={placeholder}
                    placeholderTextColor={placeholderTextColor}
                    underlineColorAndroid='transparent'
                    style={[styles.searchBarInput, inputStyle]}
                />
                {this.state.isOnFocus && this.state.value ?
                    <TouchableOpacity onPress={() => this.setState({value: ''})}>
                        <Icon
                            style={{paddingRight: (height * 0.2)}}
                            name='close'
                            size={height}
                            color={placeholderTextColor}
                        />
                    </TouchableOpacity> : null
                }
            </View>
        );
    }
}
