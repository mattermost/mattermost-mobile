// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';
import PropTypes from 'prop-types';
import {Text} from 'react-native';
import {injectIntl, intlShape} from 'react-intl';

import CustomPropTypes from 'app/constants/custom_prop_types';

class AtMention extends React.PureComponent {
    static propTypes = {
        intl: intlShape,
        mentionName: PropTypes.string.isRequired,
        mentionStyle: CustomPropTypes.Style,
        navigator: PropTypes.object.isRequired,
        textStyle: CustomPropTypes.Style,
        theme: PropTypes.object.isRequired,
        usersByUsername: PropTypes.object.isRequired
    };

    constructor(props) {
        super(props);

        const userDetails = this.getUserDetailsFromMentionName(props);
        this.state = {
            username: userDetails.username,
            id: userDetails.id
        };
    }

    componentWillReceiveProps(nextProps) {
        if (nextProps.mentionName !== this.props.mentionName || nextProps.usersByUsername !== this.props.usersByUsername) {
            const userDetails = this.getUserDetailsFromMentionName(nextProps);
            this.setState({
                username: userDetails.username,
                id: userDetails.id
            });
        }
    }

    goToUserProfile = () => {
        const {intl, navigator, theme} = this.props;
        navigator.push({
            screen: 'UserProfile',
            title: intl.formatMessage({id: 'mobile.routes.user_profile', defaultMessage: 'Profile'}),
            animated: true,
            backButtonTitle: '',
            passProps: {
                userId: this.state.id
            },
            navigatorStyle: {
                navBarTextColor: theme.sidebarHeaderTextColor,
                navBarBackgroundColor: theme.sidebarHeaderBg,
                navBarButtonColor: theme.sidebarHeaderTextColor,
                screenBackgroundColor: theme.centerChannelBg
            }
        });
    };

    getUserDetailsFromMentionName(props) {
        let mentionName = props.mentionName;

        while (mentionName.length > 0) {
            if (props.usersByUsername[mentionName]) {
                const user = props.usersByUsername[mentionName];
                return {
                    username: user.username,
                    id: user.id
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
            username: ''
        };
    }

    render() {
        const {mentionName, mentionStyle, textStyle} = this.props;
        const username = this.state.username;

        if (!username) {
            return <Text style={textStyle}>{'@' + mentionName}</Text>;
        }

        const suffix = this.props.mentionName.substring(username.length);

        return (
            <Text
                style={textStyle}
                onPress={this.goToUserProfile}
            >
                <Text style={mentionStyle}>
                    {'@' + username}
                </Text>
                {suffix}
            </Text>
        );
    }
}

export default injectIntl(AtMention);
