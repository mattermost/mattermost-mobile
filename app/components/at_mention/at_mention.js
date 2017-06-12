// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';
import PropTypes from 'prop-types';
import {Text} from 'react-native';

import CustomPropTypes from 'app/constants/custom_prop_types';

export default class AtMention extends React.PureComponent {
    static propTypes = {
        mentionName: PropTypes.string.isRequired,
        mentionStyle: CustomPropTypes.Style,
        textStyle: CustomPropTypes.Style,
        usersByUsername: PropTypes.object.isRequired
    };

    constructor(props) {
        super(props);

        this.state = {
            username: this.getUsernameFromMentionName(props)
        };
    }

    componentWillReceiveProps(nextProps) {
        if (nextProps.mentionName !== this.props.mentionName || nextProps.usersByUsername !== this.props.usersByUsername) {
            this.setState({
                username: this.getUsernameFromMentionName(nextProps)
            });
        }
    }

    getUsernameFromMentionName(props) {
        let mentionName = props.mentionName;

        while (mentionName.length > 0) {
            if (props.usersByUsername[mentionName]) {
                return props.usersByUsername[mentionName].username;
            }

            // Repeatedly trim off trailing punctuation in case this is at the end of a sentence
            if ((/[._-]$/).test(mentionName)) {
                mentionName = mentionName.substring(0, mentionName.length - 1);
            } else {
                break;
            }
        }

        return '';
    }

    render() {
        const username = this.state.username;

        if (!username) {
            return <Text style={this.props.textStyle}>{'@' + this.props.mentionName}</Text>;
        }

        const suffix = this.props.mentionName.substring(username.length);

        return (
            <Text style={this.props.textStyle}>
                <Text style={this.props.mentionStyle}>
                    {'@' + username}
                </Text>
                {suffix}
            </Text>
        );
    }
}
