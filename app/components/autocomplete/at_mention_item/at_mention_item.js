// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import ProfilePicture from 'app/components/profile_picture';
import {makeStyleSheetFromTheme} from 'app/utils/theme';

export default class AtMentionItem extends PureComponent {
    static propTypes = {
        firstName: PropTypes.string,
        lastName: PropTypes.string,
        onPress: PropTypes.func.isRequired,
        userId: PropTypes.string.isRequired,
        username: PropTypes.string,
        theme: PropTypes.object.isRequired,
    };

    completeMention = () => {
        const {onPress, username} = this.props;
        onPress(username);
    };

    render() {
        const {
            firstName,
            lastName,
            userId,
            username,
            theme,
        } = this.props;

        const style = getStyleFromTheme(theme);
        const hasFullName = firstName.length > 0 && lastName.length > 0;

        return (
            <TouchableOpacity
                key={userId}
                onPress={this.completeMention}
                style={style.row}
            >
                <View style={style.rowPicture}>
                    <ProfilePicture
                        userId={userId}
                        theme={theme}
                        size={20}
                        status={null}
                    />
                </View>
                <Text style={style.rowUsername}>{`@${username}`}</Text>
                {hasFullName && <Text style={style.rowUsername}>{' - '}</Text>}
                {hasFullName && <Text style={style.rowFullname}>{`${firstName} ${lastName}`}</Text>}
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
        rowUsername: {
            fontSize: 13,
            color: theme.centerChannelColor,
        },
        rowFullname: {
            color: theme.centerChannelColor,
            opacity: 0.6,
        },
    };
});
