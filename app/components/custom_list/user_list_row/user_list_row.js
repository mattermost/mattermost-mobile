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

        if (user.delete_at > 0) {
            usernameDisplay = formatMessage({
                id: 'more_direct_channels.directchannel.deactivated',
                defaultMessage: '{displayname} - Deactivated',
            }, {displayname: usernameDisplay});
        }

        const teammateDisplay = displayUsername(user, teammateNameDisplay);
        const showTeammateDisplay = teammateDisplay !== username;

        return (
            <View style={style.container}>
                <CustomListRow
                    id={id}
                    theme={theme}
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
                    <View style={[style.textContainer, (showTeammateDisplay ? style.showTeammateDisplay : style.hideTeammateDisplay)]}>
                        <View>
                            <Text
                                style={style.username}
                                ellipsizeMode='tail'
                                numberOfLines={1}
                            >
                                {usernameDisplay}
                            </Text>
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
                    </View>
                    <View style={style.rightFiller}/>
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
            marginLeft: 10,
        },
        profileContainer: {
            flexDirection: 'row',
            marginLeft: 10,
            color: theme.centerChannelColor,
        },
        textContainer: {
            marginLeft: 5,
        },
        showTeammateDisplay: {
            flexDirection: 'column',
            flex: 1,
        },
        hideTeammateDisplay: {
            justifyContent: 'center',
        },
        displayName: {
            fontSize: 15,
            color: changeOpacity(theme.centerChannelColor, 0.5),
        },
        username: {
            fontSize: 15,
            color: theme.centerChannelColor,
        },
        rightFiller: {
            width: 25,
        },
    };
});
