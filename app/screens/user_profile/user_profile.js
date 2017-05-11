// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PropTypes, PureComponent} from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';

import ProfilePicture from 'app/components/profile_picture';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';
import {getFullName} from 'mattermost-redux/utils/user_utils';

import UserProfileRow from './user_profile_row';

export default class UserProfile extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            handleSendMessage: PropTypes.func.isRequired
        }).isRequired,
        config: PropTypes.object.isRequired,
        currentUserId: PropTypes.string.isRequired,
        navigator: PropTypes.object,
        theme: PropTypes.object.isRequired,
        user: PropTypes.object.isRequired
    };

    getDisplayName = () => {
        const {theme, user} = this.props;
        const style = createStyleSheet(theme);

        const displayName = getFullName(user);

        if (displayName) {
            return <Text style={style.displayName}>{displayName}</Text>;
        }

        return null;
    };

    buildDisplayBlock = (property) => {
        const {theme, user} = this.props;
        const style = createStyleSheet(theme);

        if (user.hasOwnProperty(property) && user[property].length > 0) {
            return (
                <View>
                    <Text style={style.header}>{property.toUpperCase()}</Text>
                    <Text style={style.text}>{user[property]}</Text>
                </View>
            );
        }

        return null;
    };

    sendMessage = () => {
        const {actions, navigator, user} = this.props;
        actions.handleSendMessage(user.id);
        navigator.pop({
            animated: true
        });
    };

    render() {
        const {config, currentUserId, theme, user} = this.props;
        const style = createStyleSheet(theme);

        return (
            <View style={style.container}>
                <ScrollView
                    style={style.scrollView}
                    contentContainerStyle={style.scrollViewContent}
                >
                    <View style={style.top}>
                        <ProfilePicture
                            user={user}
                            size={150}
                            statusBorderWidth={6}
                            statusSize={40}
                            statusIconSize={18}
                        />
                        {this.getDisplayName()}
                        <Text style={style.username}>{`@${user.username}`}</Text>
                    </View>
                    <View style={style.content}>
                        {this.buildDisplayBlock('username')}
                        {config.ShowEmailAddress === 'true' && this.buildDisplayBlock('email')}
                        {this.buildDisplayBlock('position')}
                    </View>
                    {currentUserId !== user.id &&
                        <UserProfileRow
                            action={this.sendMessage}
                            defaultMessage='Send Message'
                            icon='paper-plane-o'
                            textId='mobile.routes.user_profile.send_message'
                            theme={theme}
                        />
                    }
                </ScrollView>
            </View>
        );
    }
}

const createStyleSheet = makeStyleSheetFromTheme((theme) => {
    return StyleSheet.create({
        container: {
            flex: 1
        },
        content: {
            marginBottom: 25,
            marginHorizontal: 15
        },
        displayName: {
            marginTop: 15,
            color: theme.centerChannelColor,
            fontSize: 17,
            fontWeight: '600'
        },
        header: {
            fontSize: 13,
            fontWeight: '600',
            color: changeOpacity(theme.centerChannelColor, 0.5),
            marginTop: 25,
            marginBottom: 10
        },
        scrollView: {
            flex: 1,
            backgroundColor: theme.centerChannelBg
        },
        scrollViewContent: {
            flex: 1
        },
        text: {
            fontSize: 15,
            color: theme.centerChannelColor
        },
        top: {
            padding: 25,
            alignItems: 'center',
            justifyContent: 'center'
        },
        username: {
            marginTop: 15,
            color: theme.centerChannelColor,
            fontSize: 15
        }
    });
});
