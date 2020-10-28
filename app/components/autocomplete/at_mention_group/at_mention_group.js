// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Text,
    View,
} from 'react-native';

import CompassIcon from '@components/compass_icon';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {makeStyleSheetFromTheme, changeOpacity} from '@utils/theme';

export default class GroupMentionItem extends PureComponent {
    static propTypes = {
        completeHandle: PropTypes.string.isRequired,
        onPress: PropTypes.func.isRequired,
        theme: PropTypes.object.isRequired,
    };

    completeMention = () => {
        const {onPress, completeHandle} = this.props;
        onPress(completeHandle);
    };

    render() {
        const {
            completeHandle,
            theme,
        } = this.props;

        const style = getStyleFromTheme(theme);

        return (
            <TouchableWithFeedback
                onPress={this.completeMention}
                style={style.row}
                type={'opacity'}
            >
                <View style={style.rowPicture}>
                    <CompassIcon
                        name='account-group-outline'
                        style={style.rowIcon}
                    />
                </View>
                <Text style={style.rowUsername}>{`@${completeHandle}`}</Text>
                <Text style={style.rowUsername}>{' - '}</Text>
                <Text style={style.rowFullname}>{`${completeHandle}`}</Text>
            </TouchableWithFeedback>
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
