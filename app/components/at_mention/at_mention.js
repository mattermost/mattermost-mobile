// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import PropTypes from 'prop-types';
import {Clipboard, Platform, Text} from 'react-native';
import {intlShape} from 'react-intl';

import {displayUsername} from 'mattermost-redux/utils/user_utils';

import {emptyFunction} from 'app/utils/general';
import {getChannelOrUserFromMention} from 'app/utils/mention';

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
        teammateNameDisplay: PropTypes.string,
        theme: PropTypes.object.isRequired,
        usersByUsername: PropTypes.object.isRequired,
    };

    static defaultProps = {
        onLongPress: emptyFunction,
    };

    static contextTypes = {
        intl: intlShape,
    };

    constructor(props) {
        super(props);

        const user = getChannelOrUserFromMention(props.mentionName, props.usersByUsername);
        this.state = {
            user,
        };
    }

    static getDerivedStateFromProps(nextProps, prevState) {
        const nextUser = getChannelOrUserFromMention(nextProps.mentionName, nextProps.usersByUsername);
        if (nextUser !== prevState.user) {
            return {user: nextUser};
        }

        return null;
    }

    goToUserProfile = () => {
        const {user} = this.state;
        if (!user) {
            return;
        }

        const {navigator, theme} = this.props;
        const {intl} = this.context;
        const options = {
            screen: 'UserProfile',
            title: intl.formatMessage({id: 'mobile.routes.user_profile', defaultMessage: 'Profile'}),
            animated: true,
            backButtonTitle: '',
            passProps: {
                userId: this.state.user.id,
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
    };

    handleCopyMention = () => {
        const {username} = this.state;
        Clipboard.setString(`@${username}`);
    };

    render() {
        const {isSearchResult, mentionName, mentionStyle, onPostPress, teammateNameDisplay, textStyle} = this.props;
        const {user} = this.state;

        if (!user) {
            return <Text style={textStyle}>{'@' + mentionName}</Text>;
        }

        const suffix = this.props.mentionName.substring(user.username.length);

        return (
            <Text
                style={textStyle}
                onPress={isSearchResult ? onPostPress : this.goToUserProfile}
                onLongPress={this.handleLongPress}
            >
                <Text style={mentionStyle}>
                    {'@' + displayUsername(user, teammateNameDisplay)}
                </Text>
                {suffix}
            </Text>
        );
    }
}
