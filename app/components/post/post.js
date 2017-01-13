// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';
import {Text, View} from 'react-native';

import FormattedText from 'app/components/formatted_text';
import FormattedTime from 'app/components/formatted_time';

import {isSystemMessage} from 'service/utils/post_utils.js';

export default class Post extends React.Component {
    static propTypes = {
        style: React.PropTypes.object,
        post: React.PropTypes.object.isRequired,
        user: React.PropTypes.object,
        theme: React.PropTypes.object.isRequired
    };

    render() {
        let displayName;
        if (isSystemMessage(this.props.post)) {
            displayName = 'System'; // TODO this should be localized
        } else if (this.props.user) {
            displayName = this.props.user.username;
        } else {
            displayName = (
                <FormattedText
                    id='channel_loader.someone'
                    defaultMessage='Someone'
                />
            );
        }

        return (
            <View style={this.props.style}>
                <Text>
                    {'['}
                    <FormattedTime value={this.props.post.create_at}/>
                    {'] '}
                    {displayName}
                    {': ' + this.props.post.message}</Text>
            </View>
        );
    }
}
