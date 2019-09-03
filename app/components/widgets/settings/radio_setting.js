// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {Text, TouchableOpacity, View} from 'react-native';
import CheckMark from 'app/components/checkmark';
import {paddingHorizontal as padding} from 'app/components/safe_area_view/iphone_x_spacing';
import FormattedText from 'app/components/formatted_text';
import {makeStyleSheetFromTheme, changeOpacity} from 'app/utils/theme';

export default class RadioSetting extends PureComponent {
    static propTypes = {
        id: PropTypes.string.isRequired,
        label: PropTypes.node.isRequired,
        values: PropTypes.array.isRequired,
        value: PropTypes.string.isRequired,
        onChange: PropTypes.func.isRequired,
        theme: PropTypes.object.isRequired,
        isLandscape: PropTypes.bool.isRequired,
        helpText: PropTypes.node,
        optional: PropTypes.bool,
        showRequiredAsterisk: PropTypes.bool,
    };

    static defaultProps = {
        optional: false,
        showRequiredAsterisk: false,
        isLandscape: false,
    };

    handleChange = (item) => {
        this.props.onChange(this.props.id, item);
    }

    renderCheckMark = (value) => {
        if (value === this.props.value) {
            return (
                <CheckMark
                    width={12}
                    height={12}
                    color={this.props.theme.linkColor}
                />
            );
        }
        return null;
    }

    renderRowSeparator = (idx, separatorStyle) => {
        const {values} = this.props;
        if (idx === values.length - 1) {
            return null;
        }
        return <View style={separatorStyle}/>;
    }

    render() {
        const {
            theme,
            label,
            helpText,
            showRequiredAsterisk,
            optional,
            isLandscape,
        } = this.props;
        const style = getStyleSheet(theme);

        let helpTextContent;
        if (helpText) {
            helpTextContent = (
                <Text style={style.helpText}>
                    {helpText}
                </Text>
            );
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

        const options = [];
        for (const [i, {value, text}] of this.props.values.entries()) {
            options.push(
                <TouchableOpacity
                    onPress={() => this.handleChange(value)}
                    key={value}
                >
                    <View style={[style.container, padding(isLandscape)]}>
                        <View style={style.rowContainer}>
                            <Text>{text}</Text>
                        </View>
                        {this.renderCheckMark(value)}
                    </View>
                    {this.renderRowSeparator(i, style.separator)}
                </TouchableOpacity>
            );
        }
        return (
            <View>
                <View style={style.titleContainer}>
                    <Text style={style.title}>{label}</Text>
                    {asterisk}
                    {optionalContent}
                </View>

                <View style={[style.items, padding(isLandscape)]}>
                    {options}
                </View>

                {helpTextContent}
            </View>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 15,
        },
        rowContainer: {
            alignItems: 'center',
            flex: 1,
            flexDirection: 'row',
            height: 45,
        },
        items: {
            backgroundColor: theme.centerChannelBg,
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderTopColor: changeOpacity(theme.centerChannelColor, 0.1),
            borderBottomColor: changeOpacity(theme.centerChannelColor, 0.1),
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
            marginVertical: 10,
        },
        asterisk: {
            color: theme.errorTextColor,
            fontSize: 14,
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
        separator: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.1),
            flex: 1,
            height: 1,
            marginLeft: 15,
        },
    };
});
