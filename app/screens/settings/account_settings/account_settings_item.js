// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    View,
    TextInput
} from 'react-native';

import FormattedText from 'app/components/formatted_text';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

export default class AccountSettingsItem extends PureComponent {
    static propTypes = {
        theme: PropTypes.object.isRequired,
        format: PropTypes.shape({
            id: PropTypes.string.isRequired,
            defaultMessage: PropTypes.string.isRequired
        }),
        value: PropTypes.string.isRequired,
        updateValue: PropTypes.func.isRequired,
        optional: PropTypes.bool,
        editable: PropTypes.bool
    };

    static defaultProps = {
        optional: false,
        editable: true
    };

    render() {
        const {
            theme,
            format,
            optional,
            editable,
            value,
            updateValue
        } = this.props;
        const style = getStyleSheet(theme);

        return (
            <View>
                <View style={style.titleContainer15}>
                    <FormattedText
                        style={style.title}
                        id={format.id}
                        defaultMessage={format.defaultMessage}
                    />
                    {optional && (
                        <FormattedText
                            style={style.optional}
                            id='channel_modal.optional'
                            defaultMessage='(optional)'
                        />
                    )}
                </View>
                <View style={style.inputContainer}>
                    <TextInput
                        ref={this.channelNameRef}
                        value={value}
                        onChangeText={updateValue}
                        style={style.input}
                        autoCapitalize='none'
                        autoCorrect={false}
                        editable={editable}
                        underlineColorAndroid='transparent'
                    />
                </View>
            </View>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        inputContainer: {
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderTopColor: changeOpacity(theme.centerChannelColor, 0.1),
            borderBottomColor: changeOpacity(theme.centerChannelColor, 0.1),
            backgroundColor: theme.centerChannelBg
        },
        input: {
            color: '#333',
            fontSize: 14,
            height: 40,
            paddingHorizontal: 15
        },
        title: {
            fontSize: 14,
            color: theme.centerChannelColor,
            marginLeft: 15
        },
        titleContainer15: {
            flexDirection: 'row',
            marginTop: 15
        },
        optional: {
            color: changeOpacity(theme.centerChannelColor, 0.5),
            fontSize: 14,
            marginLeft: 5
        }
    };
});
