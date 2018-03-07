// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';
import PropTypes from 'prop-types';
import {Clipboard, Platform, Text} from 'react-native';
import {intlShape} from 'react-intl';

import CustomPropTypes from 'app/constants/custom_prop_types';
import mattermostManaged from 'app/mattermost_managed';

export default class AtMention extends React.PureComponent {
    static propTypes = {
        isSearchResult: PropTypes.bool,
        mentionName: PropTypes.string.isRequired,
        mentionStyle: CustomPropTypes.Style,
        navigator: PropTypes.object.isRequired,
        onLongPress: PropTypes.func.isRequired,
        onPostPress: PropTypes.func,
        textStyle: CustomPropTypes.Style,
        theme: PropTypes.object.isRequired,
        usersByUsername: PropTypes.object.isRequired,
    };

    static contextTypes = {
        intl: intlShape,
    }

    constructor(props) {
        super(props);

        const userDetails = this.getUserDetailsFromMentionName(props);
        this.state = {
            username: userDetails.username,
            id: userDetails.id,
        };
    }

    componentWillReceiveProps(nextProps) {
        if (nextProps.mentionName !== this.props.mentionName || nextProps.usersByUsername !== this.props.usersByUsername) {
            const userDetails = this.getUserDetailsFromMentionName(nextProps);
            this.setState({
                username: userDetails.username,
                id: userDetails.id,
            });
        }
    }

    goToUserProfile = () => {
        const {navigator, theme} = this.props;
        const {intl} = this.context;
        const options = {
            screen: 'UserProfile',
            title: intl.formatMessage({id: 'mobile.routes.user_profile', defaultMessage: 'Profile'}),
            animated: true,
            backButtonTitle: '',
            passProps: {
                userId: this.state.id,
            },
            navigatorStyle: {
                navBarTextColor: theme.sidebarHeaderTextColor,
                navBarBackgroundColor: theme.sidebarHeaderBg,
                navBarButtonColor: theme.sidebarHeaderTextColor,
                screenBackgroundColor: theme.centerChannelBg,
            },
        };

        if (Platform.OS === 'ios') {
            navigator.push(options);
        } else {
            navigator.showModal(options);
        }
    };

    getUserDetailsFromMentionName(props) {
        let mentionName = props.mentionName;

        while (mentionName.length > 0) {
            if (props.usersByUsername.hasOwnProperty(mentionName)) {
                const user = props.usersByUsername[mentionName];
                return {
                    username: user.username,
                    id: user.id,
                };
            }

            // Repeatedly trim off trailing punctuation in case this is at the end of a sentence
            if ((/[._-]$/).test(mentionName)) {
                mentionName = mentionName.substring(0, mentionName.length - 1);
            } else {
                break;
            }
        }

        return {
            username: '',
        };
    }

    handleLongPress = async () => {
        const {intl} = this.context;

        const config = await mattermostManaged.getLocalConfig();

        let action;
        if (config.copyAndPasteProtection !== 'false') {
            action = {
                text: intl.formatMessage({
                    id: 'mobile.mention.copy_mention',
                    defaultMessage: 'Copy Mention',
                }),
                onPress: this.handleCopyMention,
            };
        }

        this.props.onLongPress(action);
    }

    handleCopyMention = () => {
        const {username} = this.state;
        Clipboard.setString(`@${username}`);
    }

    render() {
        const {isSearchResult, mentionName, mentionStyle, onPostPress, textStyle} = this.props;
        const username = this.state.username;

        if (!username) {
            return <Text style={textStyle}>{'@' + mentionName}</Text>;
        }

        const suffix = this.props.mentionName.substring(username.length);

        return (
            <Text
                style={textStyle}
                onPress={isSearchResult ? onPostPress : this.goToUserProfile}
                onLongPress={this.handleLongPress}
            >
                <Text style={mentionStyle}>
                    {'@' + username}
                </Text>
                {suffix}
            </Text>
        );
    }
}
