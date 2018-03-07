// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import PropTypes from 'prop-types';
import React from 'react';
import {
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

import {displayUsername} from 'mattermost-redux/utils/user_utils';

export default class SelectedUser extends React.PureComponent {
    static propTypes = {

        /*
         * The current theme.
         */
        theme: PropTypes.object.isRequired,

        /*
         * How to display the names of users.
         */
        teammateNameDisplay: PropTypes.string.isRequired,

        /*
         * The user that this component represents.
         */
        user: PropTypes.object.isRequired,

        /*
         * A handler function that will deselect a user when clicked on.
         */
        onRemove: PropTypes.func.isRequired,
    };

    onRemove = () => {
        this.props.onRemove(this.props.user.id);
    };

    render() {
        const style = getStyleFromTheme(this.props.theme);

        return (
            <View style={style.container}>
                <Text style={style.text}>
                    {displayUsername(this.props.user, this.props.teammateNameDisplay)}
                </Text>
                <TouchableOpacity
                    style={style.remove}
                    onPress={this.onRemove}
                >
                    <Icon
                        name='close'
                        size={14}
                        color={this.props.theme.centerChannelColor}
                    />
                </TouchableOpacity>
            </View>
        );
    }
}

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            alignItems: 'center',
            flexDirection: 'row',
            height: 27,
            borderRadius: 3,
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.2),
            marginBottom: 2,
            marginRight: 10,
            marginTop: 10,
            paddingLeft: 10,
        },
        remove: {
            paddingHorizontal: 10,
        },
        text: {
            color: theme.centerChannelColor,
            fontSize: 13,
        },
    };
});
