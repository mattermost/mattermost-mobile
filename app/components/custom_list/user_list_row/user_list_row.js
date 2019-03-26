// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import PropTypes from 'prop-types';
import {intlShape} from 'react-intl';
import {
    Text,
    View,
} from 'react-native';

import {displayUsername} from 'mattermost-redux/utils/user_utils';

import ProfilePicture from 'app/components/profile_picture';
import BotTag from 'app/components/bot_tag';
import {makeStyleSheetFromTheme, changeOpacity} from 'app/utils/theme';
import CustomListRow from 'app/components/custom_list/custom_list_row';

export default class UserListRow extends React.PureComponent {
    static propTypes = {
        id: PropTypes.string.isRequired,
        isMyUser: PropTypes.bool.isRequired,
        theme: PropTypes.object.isRequired,
        user: PropTypes.object.isRequired,
        teammateNameDisplay: PropTypes.string.isRequired,
        ...CustomListRow.propTypes,
    };

    static contextTypes = {
        intl: intlShape,
    };

    onPress = () => {
        if (this.props.onPress) {
            this.props.onPress(this.props.id, this.props.item);
        }
    };

    render() {
        const {formatMessage} = this.context.intl;
        const {
            enabled,
            isMyUser,
            selectable,
            selected,
            teammateNameDisplay,
            theme,
            user,
        } = this.props;

        const {id, username} = user;
        const style = getStyleFromTheme(theme);

        let usernameDisplay = `@${username}`;
        if (isMyUser) {
            usernameDisplay = formatMessage({
                id: 'mobile.more_dms.you',
                defaultMessage: '@{username} - you',
            }, {username});
        }

        const teammateDisplay = displayUsername(user, teammateNameDisplay);
        const showTeammateDisplay = teammateDisplay !== username;

        return (
            <View style={style.container}>
                <CustomListRow
                    id={id}
                    onPress={this.onPress}
                    enabled={enabled}
                    selectable={selectable}
                    selected={selected}
                >
                    <View style={style.profileContainer}>
                        <ProfilePicture
                            userId={id}
                            size={32}
                        />
                    </View>
                    <View style={style.textContainer}>
                        <View>
                            <View style={style.indicatorContainer}>
                                <Text
                                    style={style.username}
                                    ellipsizeMode='tail'
                                    numberOfLines={1}
                                >
                                    {usernameDisplay}
                                </Text>
                                <BotTag
                                    show={Boolean(user.is_bot)}
                                    theme={theme}
                                />
                            </View>
                        </View>
                        {showTeammateDisplay &&
                        <View>
                            <Text
                                style={style.displayName}
                                ellipsizeMode='tail'
                                numberOfLines={1}
                            >
                                {teammateDisplay}
                            </Text>
                        </View>
                        }
                        {user.delete_at > 0 &&
                        <View>
                            <Text
                                style={style.deactivated}
                            >
                                {formatMessage({id: 'mobile.user_list.deactivated', defaultMessage: 'Deactivated'})}
                            </Text>
                        </View>
                        }
                    </View>
                </CustomListRow>
            </View>
        );
    }
}

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            flex: 1,
            flexDirection: 'row',
            marginHorizontal: 10,
            overflow: 'hidden',
        },
        profileContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            color: theme.centerChannelColor,
        },
        textContainer: {
            marginLeft: 10,
            justifyContent: 'center',
            flexDirection: 'column',
            flex: 1,
        },
        displayName: {
            fontSize: 15,
            color: changeOpacity(theme.centerChannelColor, 0.5),
        },
        username: {
            fontSize: 15,
            color: theme.centerChannelColor,
        },
        indicatorContainer: {
            flexDirection: 'row',
        },
        deactivated: {
            marginTop: 2,
            fontSize: 12,
            color: changeOpacity(theme.centerChannelColor, 0.5),
        },
    };
});
