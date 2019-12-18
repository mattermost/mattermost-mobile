// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    View,
    Text,
    Switch,
} from 'react-native';

import FormattedText from 'app/components/formatted_text';
import {
    changeOpacity,
    makeStyleSheetFromTheme,
} from 'app/utils/theme';
import {paddingHorizontal as padding} from 'app/components/safe_area_view/iphone_x_spacing';

export default class BoolSetting extends PureComponent {
    static propTypes = {
        id: PropTypes.string.isRequired,
        label: PropTypes.oneOfType([
            PropTypes.shape({
                id: PropTypes.string.isRequired,
                defaultMessage: PropTypes.string.isRequired,
            }),
            PropTypes.string,
        ]),
        value: PropTypes.bool.isRequired,
        placeholder: PropTypes.string,
        helpText: PropTypes.node,
        errorText: PropTypes.node,
        optional: PropTypes.bool,
        theme: PropTypes.object.isRequired,
        onChange: PropTypes.func.isRequired,
        isLandscape: PropTypes.bool.isRequired,
    };

    static defaultProps = {
        isLandscape: false,
    };

    handleChange = (value) => {
        this.props.onChange(this.props.id, Boolean(value));
    };

    render() {
        const {
            label,
            value,
            placeholder,
            helpText,
            errorText,
            optional,
            theme,
            isLandscape,
        } = this.props;
        const style = getStyleSheet(theme);

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
        } else {
            asterisk = <Text style={style.asterisk}>{' *'}</Text>;
        }

        let labelContent;
        if (label) {
            labelContent = (
                <View style={style.labelContainer}>
                    <Text style={style.label}>
                        {label}
                    </Text>
                    {asterisk}
                    {optionalContent}
                </View>

            );
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

        return (
            <React.Fragment>
                <View style={padding(isLandscape)}>
                    {labelContent}
                </View>
                <View style={style.separator}/>
                <View style={style.inputContainer}>
                    <Text style={[style.placeholderText, padding(isLandscape)]}>
                        {placeholder}
                    </Text>
                    <Switch
                        onValueChange={this.handleChange}
                        value={value}
                        style={[style.inputSwitch, padding(isLandscape)]}
                    />
                </View>
                <View style={style.separator}/>
                <View style={padding(isLandscape)}>
                    {helpTextContent}
                    {errorTextContent}
                </View>
            </React.Fragment>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        labelContainer: {
            flexDirection: 'row',
            marginTop: 15,
            marginBottom: 10,
        },
        label: {
            fontSize: 14,
            color: theme.centerChannelColor,
            marginLeft: 15,
        },
        inputContainer: {
            backgroundColor: theme.centerChannelBg,
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 15,
            height: 40,
        },
        placeholderText: {
            color: changeOpacity(theme.centerChannelColor, 0.5),
            fontSize: 15,
        },
        inputSwitch: {
            position: 'absolute',
            right: 12,
        },
        separator: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.1),
            height: 1,
            width: '100%',
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
            marginVertical: 10,
        },
        asterisk: {
            color: theme.errorTextColor,
            fontSize: 14,
        },
    };
});
