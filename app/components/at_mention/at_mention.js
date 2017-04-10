// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PropTypes, PureComponent} from 'react';
import {Text} from 'react-native';

import CustomPropTypes from 'app/constants/custom_prop_types';

export default class AtMention extends PureComponent {
    static propTypes = {
        mentionName: PropTypes.string.isRequired,
        mentionStyle: CustomPropTypes.Style,
        textStyle: CustomPropTypes.Style,
        usersByUsername: PropTypes.object.isRequired
    };

    getUsernameFromMentionName = () => {
        let mentionName = this.props.mentionName;

        while (mentionName.length > 0) {
            if (this.props.usersByUsername[mentionName]) {
                return this.props.usersByUsername[mentionName].username;
            }

            // Repeatedly trim off trailing punctuation in case this is at the end of a sentence
            if ((/[._-]$/).test(mentionName)) {
                mentionName = mentionName.substring(0, mentionName.length - 1);
            } else {
                break;
            }
        }

        // Just assume this is a mention for a user that we don't have
        return mentionName;
    }

    render() {
        const username = this.getUsernameFromMentionName();
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
