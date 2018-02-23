// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

import FormattedText from 'app/components/formatted_text';
import {makeStyleSheetFromTheme, changeOpacity} from 'app/utils/theme';

export default class SpecialMentionItem extends PureComponent {
    static propTypes = {
        completeHandle: PropTypes.string.isRequired,
        defaultMessage: PropTypes.string.isRequired,
        id: PropTypes.string.isRequired,
        onPress: PropTypes.func.isRequired,
        theme: PropTypes.object.isRequired,
        values: PropTypes.object,
    };

    completeMention = () => {
        const {onPress, completeHandle} = this.props;
        onPress(completeHandle);
    };

    render() {
        const {
            defaultMessage,
            id,
            completeHandle,
            theme,
            values,
        } = this.props;

        const style = getStyleFromTheme(theme);

        return (
            <TouchableOpacity
                onPress={this.completeMention}
                style={style.row}
            >
                <View style={style.rowPicture}>
                    <Icon
                        name='users'
                        style={style.rowIcon}
                    />
                </View>
                <Text style={style.textWrapper}>
                    <Text style={style.rowUsername}>{`@${completeHandle}`}</Text>
                    <Text style={style.rowUsername}>{' - '}</Text>
                    <FormattedText
                        id={id}
                        defaultMessage={defaultMessage}
                        values={values}
                        style={style.rowFullname}
                    />
                </Text>
            </TouchableOpacity>
        );
    }
}
const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        row: {
            paddingVertical: 8,
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: theme.centerChannelBg,
        },
        rowPicture: {
            marginHorizontal: 8,
            width: 20,
            alignItems: 'center',
            justifyContent: 'center',
        },
        rowIcon: {
            color: changeOpacity(theme.centerChannelColor, 0.7),
            fontSize: 14,
        },
        rowUsername: {
            fontSize: 13,
            color: theme.centerChannelColor,
        },
        rowFullname: {
            color: theme.centerChannelColor,
            flex: 1,
            opacity: 0.6,
        },
        textWrapper: {
            flex: 1,
            flexWrap: 'wrap',
            paddingRight: 8,
        },
    };
});
