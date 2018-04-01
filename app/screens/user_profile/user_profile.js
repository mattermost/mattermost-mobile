// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    ScrollView,
    Text,
    View,
    Linking,
} from 'react-native';
import {intlShape} from 'react-intl';

import {getDirectChannelName} from 'mattermost-redux/utils/channel_utils';
import {displayUsername} from 'mattermost-redux/utils/user_utils';

import ProfilePicture from 'app/components/profile_picture';
import StatusBar from 'app/components/status_bar';
import {alertErrorWithFallback} from 'app/utils/general';
import {changeOpacity, makeStyleSheetFromTheme, setNavigatorStyles} from 'app/utils/theme';

import UserProfileRow from './user_profile_row';
import Config from 'assets/config';

export default class UserProfile extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            makeDirectChannel: PropTypes.func.isRequired,
            setChannelDisplayName: PropTypes.func.isRequired,
        }).isRequired,
        config: PropTypes.object.isRequired,
        currentChannel: PropTypes.object.isRequired,
        currentDisplayName: PropTypes.string,
        currentUserId: PropTypes.string.isRequired,
        navigator: PropTypes.object,
        teammateNameDisplay: PropTypes.string,
        theme: PropTypes.object.isRequired,
        user: PropTypes.object.isRequired,
    };

    static contextTypes = {
        intl: intlShape.isRequired,
    };

    componentWillReceiveProps(nextProps) {
        if (this.props.theme !== nextProps.theme) {
            setNavigatorStyles(this.props.navigator, nextProps.theme);
        }
    }

    close = () => {
        const {navigator, theme} = this.props;

        navigator.resetTo({
            screen: 'Channel',
            animated: true,
            navigatorStyle: {
                animated: true,
                animationType: 'fade',
                navBarHidden: true,
                statusBarHidden: false,
                statusBarHideWithNavBar: false,
                screenBackgroundColor: theme.centerChannelBg,
            },
        });
    };

    displaySendMessageOption = () => {
        const {currentChannel, currentUserId, user} = this.props;

        return currentChannel.name !== getDirectChannelName(currentUserId, user.id);
    };

    getDisplayName = () => {
        const {theme, teammateNameDisplay, user} = this.props;
        const style = createStyleSheet(theme);

        const displayName = displayUsername(user, teammateNameDisplay);

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

    sendMessage = async () => {
        const {intl} = this.context;
        const {actions, currentDisplayName, teammateNameDisplay, user} = this.props;

        // save the current channel display name in case it fails
        const currentChannelDisplayName = currentDisplayName;

        const userDisplayName = displayUsername(user, teammateNameDisplay);
        actions.setChannelDisplayName(userDisplayName);

        const result = await actions.makeDirectChannel(user.id);
        if (result.error) {
            actions.setChannelDisplayName(currentChannelDisplayName);
            alertErrorWithFallback(
                intl,
                result.error,
                {
                    id: 'mobile.open_dm.error',
                    defaultMessage: "We couldn't open a direct message with {displayName}. Please check your connection and try again.",
                },
                {
                    displayName: userDisplayName,
                }
            );
        } else {
            this.close();
        }
    };

    handleLinkPress = (link) => {
        const username = this.props.user.username;
        const email = this.props.user.email;

        return () => {
            var hydrated = link.replace(/{email}/, email);
            hydrated = hydrated.replace(/{username}/, username);
            Linking.openURL(hydrated);
        };
    };

    renderAdditionalOptions = () => {
        if (!Config.ExperimentalProfileLinks) {
            return null;
        }

        const profileLinks = Config.ExperimentalProfileLinks;

        const additionalOptions = profileLinks.map((l) => {
            var action;
            if (l.type === 'link') {
                action = this.handleLinkPress(l.url);
            }

            return (
                <UserProfileRow
                    key={l.defaultMessage}
                    action={action}
                    defaultMessage={l.defaultMessage}
                    textId={l.textId}
                    icon={l.icon}
                    iconType={l.iconType}
                    theme={this.props.theme}
                    iconSize={l.iconSize}
                />
            );
        });

        return additionalOptions;
    };

    render() {
        const {config, theme, user} = this.props;
        const style = createStyleSheet(theme);

        if (!user) {
            return null;
        }

        return (
            <View style={style.container}>
                <StatusBar/>
                <ScrollView
                    style={style.scrollView}
                >
                    <View style={style.top}>
                        <ProfilePicture
                            userId={user.id}
                            size={150}
                            statusBorderWidth={6}
                            statusSize={40}
                        />
                        {this.getDisplayName()}
                        <Text style={style.username}>{`@${user.username}`}</Text>
                    </View>
                    <View style={style.content}>
                        {this.buildDisplayBlock('username')}
                        {config.ShowEmailAddress === 'true' && this.buildDisplayBlock('email')}
                        {this.buildDisplayBlock('position')}
                    </View>
                    {this.displaySendMessageOption() &&
                    <UserProfileRow
                        action={this.sendMessage}
                        defaultMessage='Send Message'
                        icon='paper-plane-o'
                        iconType='fontawesome'
                        textId='mobile.routes.user_profile.send_message'
                        theme={theme}
                    />
                    }
                    {this.renderAdditionalOptions()}
                </ScrollView>
            </View>
        );
    }
}

const createStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            flex: 1,
        },
        content: {
            marginBottom: 25,
            marginHorizontal: 15,
        },
        displayName: {
            marginTop: 15,
            color: theme.centerChannelColor,
            fontSize: 17,
            fontWeight: '600',
        },
        header: {
            fontSize: 13,
            fontWeight: '600',
            color: changeOpacity(theme.centerChannelColor, 0.5),
            marginTop: 25,
            marginBottom: 10,
        },
        scrollView: {
            flex: 1,
            backgroundColor: theme.centerChannelBg,
        },
        text: {
            fontSize: 15,
            color: theme.centerChannelColor,
        },
        top: {
            padding: 25,
            alignItems: 'center',
            justifyContent: 'center',
        },
        username: {
            marginTop: 15,
            color: theme.centerChannelColor,
            fontSize: 15,
        },
    };
});

