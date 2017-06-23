// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';
import {injectIntl, intlShape} from 'react-intl';

import {RequestStatus} from 'mattermost-redux/constants';
import {getDirectChannelName} from 'mattermost-redux/utils/channel_utils';
import {displayUsername} from 'mattermost-redux/utils/user_utils';

import ProfilePicture from 'app/components/profile_picture';
import StatusBar from 'app/components/status_bar';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

import UserProfileRow from './user_profile_row';

class UserProfile extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            makeDirectChannel: PropTypes.func.isRequired,
            setChannelDisplayName: PropTypes.func.isRequired
        }).isRequired,
        config: PropTypes.object.isRequired,
        currentChannel: PropTypes.object.isRequired,
        currentDisplayName: PropTypes.string,
        currentUserId: PropTypes.string.isRequired,
        createChannelRequest: PropTypes.object.isRequired,
        intl: intlShape.isRequired,
        navigator: PropTypes.object,
        myPreferences: PropTypes.object,
        theme: PropTypes.object.isRequired,
        user: PropTypes.object.isRequired
    };

    constructor(props) {
        super(props);

        this.state = {error: false};
    }

    componentWillReceiveProps(nextProps) {
        if (nextProps.createChannelRequest.status === RequestStatus.FAILURE && this.state.error) {
            const {intl, myPreferences, user} = this.props;
            const displayName = displayUsername(user, myPreferences);

            Alert.alert(
                '',
                intl.formatMessage({
                    id: 'mobile.open_dm.error',
                    defaultMessage: "We couldn't open a direct message with {displayName}. Please check your connection and try again."
                }, {displayName})
            );
            this.setState({error: false});
        }
    }

    displaySendMessageOption = () => {
        const {currentChannel, currentUserId, user} = this.props;

        return currentUserId !== user.id && currentChannel.name !== getDirectChannelName(currentUserId, user.id);
    };

    getDisplayName = () => {
        const {theme, myPreferences, user} = this.props;
        const style = createStyleSheet(theme);

        const displayName = displayUsername(user, myPreferences);

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
        const {actions, currentDisplayName, myPreferences, navigator, user} = this.props;

        // save the current channel display name in case it fails
        const currentChannelDisplayName = currentDisplayName;

        actions.setChannelDisplayName(displayUsername(user, myPreferences));

        const result = await actions.makeDirectChannel(user.id);
        if (result) {
            navigator.pop({
                animated: true
            });
        } else {
            actions.setChannelDisplayName(currentChannelDisplayName);
            this.setState({error: true});
        }
    };

    render() {
        const {config, theme, user} = this.props;
        const style = createStyleSheet(theme);

        return (
            <View style={style.container}>
                <StatusBar/>
                <ScrollView
                    style={style.scrollView}
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
                    {this.displaySendMessageOption() &&
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

export default injectIntl(UserProfile);
