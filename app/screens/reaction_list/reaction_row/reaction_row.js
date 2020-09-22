// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import PropTypes from 'prop-types';
import {intlShape} from 'react-intl';
import {
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';

import {displayUsername} from '@mm-redux/utils/user_utils';

import ProfilePicture from 'app/components/profile_picture';
import {paddingHorizontal as padding} from 'app/components/safe_area_view/iphone_x_spacing';
import {preventDoubleTap} from 'app/utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';
import {showModal} from 'app/actions/navigation';

export default class ReactionRow extends React.PureComponent {
    static propTypes = {
        teammateNameDisplay: PropTypes.string.isRequired,
        theme: PropTypes.object.isRequired,
        user: PropTypes.object.isRequired,
        isLandscape: PropTypes.bool.isRequired,
    };

    static defaultProps = {
        user: {},
    };

    static contextTypes = {
        intl: intlShape,
    };

    goToUserProfile = async () => {
        const {user, theme} = this.props;
        const {formatMessage} = this.context.intl;
        const screen = 'UserProfile';
        const title = formatMessage({id: 'mobile.routes.user_profile', defaultMessage: 'Profile'});
        const passProps = {
            userId: user.id,
        };

        if (!this.closeButton) {
            this.closeButton = await MaterialIcon.getImageSource('close', 20, theme.sidebarHeaderTextColor);
        }

        const options = {
            topBar: {
                leftButtons: [{
                    id: 'close-settings',
                    icon: this.closeButton,
                }],
            },
        };

        showModal(screen, title, passProps, options);
    };

    render() {
        const {
            teammateNameDisplay,
            user,
            isLandscape,
            theme,
        } = this.props;

        if (!user.id) {
            return null;
        }

        const {id, username} = user;
        const usernameDisplay = '@' + username;

        const style = getStyleSheet(theme);

        return (
            <View style={style.container}>
                <View style={[style.profileContainer, padding(isLandscape)]}>
                    <TouchableOpacity
                        key={user.id}
                        onPress={preventDoubleTap(this.goToUserProfile)}
                    >
                        <View style={style.profile}>
                            <ProfilePicture
                                userId={id}
                                showStatus={false}
                                size={24}
                            />
                        </View>
                    </TouchableOpacity>
                </View>
                <Text
                    style={style.textContainer}
                    ellipsizeMode='tail'
                    numberOfLines={1}
                >
                    <Text style={style.username}>
                        {usernameDisplay}
                    </Text>
                    <Text>{'  '}</Text>
                    <Text style={style.displayName}>
                        {displayUsername(user, teammateNameDisplay)}
                    </Text>
                </Text>
            </View>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            flexDirection: 'row',
            justifyContent: 'flex-start',
            height: 44,
            width: '100%',
            alignItems: 'center',
        },
        profileContainer: {
            alignItems: 'center',
            width: '13%',
        },
        profile: {
            paddingTop: 3,
        },
        textContainer: {
            width: '74%',
            flexDirection: 'row',
        },
        username: {
            fontSize: 14,
            paddingRight: 5,
            color: theme.centerChannelColor,
        },
        displayName: {
            fontSize: 14,
            color: changeOpacity(theme.centerChannelColor, 0.5),
        },
    };
});
