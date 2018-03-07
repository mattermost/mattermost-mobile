// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {Text, TouchableOpacity, View} from 'react-native';

import {emptyFunction} from 'app/utils/general';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

import ProfilePicture from 'app/components/profile_picture';

export default class UserInfo extends PureComponent {
    static propTypes = {
        user: PropTypes.object.isRequired,
        onPress: PropTypes.func,
        theme: PropTypes.object.isRequired,
    };

    static defaultProps = {
        onPress: emptyFunction,
    };

    render() {
        const {user, onPress, theme} = this.props;
        const {first_name: firstName, last_name: lastName} = user;
        const style = getStyleSheet(theme);

        let fullName;
        if (firstName && lastName) {
            fullName = `${firstName} ${lastName}`;
        } else if (firstName) {
            fullName = firstName;
        } else if (lastName) {
            fullName = lastName;
        }

        return (
            <TouchableOpacity onPress={onPress}>
                <View style={style.container}>
                    <ProfilePicture
                        size={50}
                        showStatus={false}
                        userId={user.id}
                    />
                    <View style={style.wrapper}>
                        <View>
                            <Text style={style.username}>
                                {`@${user.username}`}
                            </Text>
                        </View>
                        {Boolean(fullName) &&
                        <View>
                            <Text style={style.fullName}>{fullName}</Text>
                        </View>
                        }
                    </View>
                </View>
            </TouchableOpacity>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            alignItems: 'center',
            padding: 15,
            flexDirection: 'row',
        },
        wrapper: {
            marginLeft: 10,
        },
        username: {
            color: theme.centerChannelColor,
            marginVertical: 5,
            fontWeight: '600',
            fontSize: 15,
        },
        fullName: {
            color: changeOpacity(theme.centerChannelColor, 0.5),
            fontSize: 15,
        },
    };
});
