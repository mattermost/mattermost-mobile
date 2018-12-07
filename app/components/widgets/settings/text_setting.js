// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    View,
    Text,
    TextInput,
    Platform,
} from 'react-native';

import FormattedText from 'app/components/formatted_text';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

export default class TextSetting extends PureComponent {
    static propTypes = {
        id: PropTypes.string.isRequired,
        label: PropTypes.oneOfType([
            PropTypes.shape({
                id: PropTypes.string.isRequired,
                defaultMessage: PropTypes.string.isRequired,
            }),
            PropTypes.string,
        ]),
        placeholder: PropTypes.string,
        helpText: PropTypes.node,
        errorText: PropTypes.node,
        disabled: PropTypes.bool,
        disabledText: PropTypes.string,
        maxLength: PropTypes.number,
        optional: PropTypes.bool,
        theme: PropTypes.object.isRequired,
        onChange: PropTypes.func.isRequired,
        value: PropTypes.string.isRequired,
        multiline: PropTypes.bool,
        showRequiredAsterisk: PropTypes.bool,
        keyboardType: PropTypes.oneOf([
            'default',
            'number-pad',
            'decimal-pad',
            'numeric',
            'email-address',
            'phone-pad',
            'url',
        ]),
    };

    static defaultProps = {
        optional: false,
        disabled: false,
        multiline: false,
        showRequiredAsterisk: false,
        keyboardType: 'default',
    };

    onChangeText = (value) => {
        const {id, onChange} = this.props;
        onChange(id, value);
    };

    render() {
        const {
            theme,
            label,
            placeholder,
            helpText,
            optional,
            disabled,
            disabledText,
            errorText,
            value,
            multiline,
            showRequiredAsterisk,
        } = this.props;
        const style = getStyleSheet(theme);

        let labelContent = label;
        if (label && label.defaultMessage) {
            labelContent = (
                <FormattedText
                    style={style.title}
                    id={label.id}
                    defaultMessage={label.defaultMessage}
                />
            );
        } else if (typeof label === 'string') {
            labelContent = <Text style={style.title}>{label}</Text>;
        }

        let optionalContent;
        let asterisk;
        if (optional) {
            optionalContent = (
                <FormattedText
                    style={style.optional}
                    id='channel_modal.optional'
                    defaultMessage='(optional)'
                />
            );
        } else if (showRequiredAsterisk) {
            asterisk = <Text style={style.asterisk}>{' *'}</Text>;
        }

        let {keyboardType} = this.props;
        if (Platform.OS === 'android' && keyboardType === 'url') {
            keyboardType = 'default';
        }

        let inputStyle = style.input;
        if (multiline) {
            inputStyle = style.multiline;
        }

        let helpTextContent;
        if (helpText) {
            helpTextContent = (
                <Text style={style.helpText}>
                    {helpText}
                </Text>
            );
        }

        let errorTextContent;
        if (errorText) {
            errorTextContent = (
                <Text style={style.errorText}>
                    {errorText}
                </Text>
            );
        }

        let disabledTextContent;
        if (disabled && disabledText) {
            disabledTextContent = (
                <Text style={style.helpText}>
                    {disabledText}
                </Text>
            );
        }

        return (
            <View>
                <View style={style.titleContainer}>
                    {labelContent}
                    {asterisk}
                    {optionalContent}
                </View>
                <View style={style.inputContainer}>
                    <View style={disabled ? style.disabled : null}>
                        <TextInput
                            value={value}
                            placeholder={placeholder}
                            onChangeText={this.onChangeText}
                            style={inputStyle}
                            autoCapitalize='none'
                            autoCorrect={false}
                            maxLength={this.props.maxLength}
                            editable={!disabled}
                            underlineColorAndroid='transparent'
                            disableFullscreenUI={true}
                            multiline={multiline}
                            keyboardType={keyboardType}
                        />
                    </View>
                </View>
                {disabledTextContent}
                {helpTextContent}
                {errorTextContent}
            </View>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    const input = {
        color: theme.centerChannelColor,
        fontSize: 14,
        paddingHorizontal: 15,
    };

    return {
        inputContainer: {
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderTopColor: changeOpacity(theme.centerChannelColor, 0.1),
            borderBottomColor: changeOpacity(theme.centerChannelColor, 0.1),
            backgroundColor: theme.centerChannelBg,
        },
        input: {
            ...input,
            height: 40,
        },
        multiline: {
            ...input,
            paddingTop: 10,
            paddingBottom: 13,
            height: 125,
        },
        disabled: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.1),
        },
        title: {
            fontSize: 14,
            color: theme.centerChannelColor,
            marginLeft: 15,
        },
        titleContainer: {
            flexDirection: 'row',
            marginTop: 15,
            marginBottom: 10,
        },
        optional: {
            color: changeOpacity(theme.centerChannelColor, 0.5),
            fontSize: 14,
            marginLeft: 5,
        },
        helpText: {
            fontSize: 12,
            color: changeOpacity(theme.centerChannelColor, 0.5),
            marginHorizontal: 15,
            marginTop: 10,
        },
        errorText: {
            fontSize: 12,
            color: theme.errorTextColor,
            marginHorizontal: 15,
            marginTop: 10,
        },
        asterisk: {
            color: theme.errorTextColor,
            fontSize: 14,
        },
    };
});
