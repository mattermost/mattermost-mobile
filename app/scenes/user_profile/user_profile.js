// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
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
import {getFullName} from 'service/utils/user_utils';

import UserProfileRow from './user_profile_row';

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

export default class UserProfile extends PureComponent {
    static propTypes = {
        currentUserId: PropTypes.string.isRequired,
        theme: PropTypes.object.isRequired,
        user: PropTypes.object.isRequired,
        actions: PropTypes.shape({
            handleSendMessage: PropTypes.func.isRequired
        }).isRequired
    };

    state = {
        isFavorite: false
    }

    getDisplayName = () => {
        const {theme, user} = this.props;
        const style = createStyleSheet(theme);

        const displayName = getFullName(user);

        if (displayName) {
            return <Text style={style.displayName}>{displayName}</Text>;
        }

        return null;
    }

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
    }

    sendMessage = () => {
        this.props.actions.handleSendMessage(this.props.user.id);
    }

    render() {
        const {theme, user} = this.props;
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
                        {this.buildDisplayBlock('email')}
                        {this.buildDisplayBlock('position')}
                    </View>
                    {this.props.currentUserId !== this.props.user.id &&
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
