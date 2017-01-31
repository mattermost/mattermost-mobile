// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';
import {Image, View} from 'react-native';

import Client from 'service/client';

export default class ProfilePicture extends React.PureComponent {
    static propTypes = {
        style: React.PropTypes.oneOfType([React.PropTypes.array, React.PropTypes.number, React.PropTypes.object]),
        user: React.PropTypes.object
    };

    render() {
        if (!this.props.user) {
            return <View style={this.props.style}/>;
        }

        // TODO use the client method added by Jarred
        // TODO add the second argument to Jarred's function
        // const pictureUrl = Client.getProfilePictureUrl(data.id, data.last_picture_update);
        const pictureUrl = `${Client.getUsersRoute()}/${this.props.user.id}/image?time=${this.props.user.last_picture_update}`;

        // TODO status icon

        return (
            <Image
                style={this.props.style}
                source={{uri: pictureUrl}}
            />
        );
    }
}
