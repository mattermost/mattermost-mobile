// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';

import {Text, View} from 'react-native';

export default class ChannelList extends React.Component {
    static propTypes = {
        currentTeam: React.PropTypes.object.isRequired,
        currentChannelId: React.PropTypes.string.isRequired,
        channels: React.PropTypes.object.isRequired,
        preferences: React.PropTypes.object.isRequired,
        theme: React.PropTypes.object.isRequired,
        onSelectChannel: React.PropTypes.func,
        closeChannelSidebar: React.PropTypes.func
    };

    onSelectChannel = (channel) => {
        console.log('clicked channel ' + channel.name); // eslint-disable-line no-console

        this.props.onSelectChannel(channel.id);
        this.props.closeChannelSidebar();
    }

    render() {
        let {
            favoriteChannels,
            publicChannels,
            privateChannels,
            directChannels,
            directNonTeamChannels
        } = this.props.channels;

        favoriteChannels = favoriteChannels.map((channel) => {
            return (
                <Text
                    key={channel.id}
                    style={{height: 80, width: 100}}
                    onPress={() => this.onSelectChannel(channel)}
                >
                    {channel.display_name}
                </Text>
            );
        });

        publicChannels = publicChannels.map((channel) => {
            return (
                <Text
                    key={channel.id}
                    style={{height: 80, width: 100}}
                    onPress={() => this.onSelectChannel(channel)}
                >
                    {channel.display_name}
                </Text>
            );
        });

        privateChannels = privateChannels.map((channel) => {
            return (
                <Text
                    key={channel.id}
                    style={{height: 80, width: 100}}
                    onPress={() => this.onSelectChannel(channel)}
                >
                    {channel.display_name}
                </Text>
            );
        });

        directChannels = directChannels.map((channel) => {
            return (
                <Text
                    key={channel.id}
                    style={{height: 80, width: 100}}
                    onPress={() => this.onSelectChannel(channel)}
                >
                    {channel.display_name}
                </Text>
            );
        });

        directNonTeamChannels = directNonTeamChannels.map((channel) => {
            return (
                <Text
                    key={channel.id}
                    style={{height: 80, width: 100}}
                    onPress={() => this.onSelectChannel(channel)}
                >
                    {channel.display_name}
                </Text>
            );
        });

        const {
            theme
        } = this.props;

        return (
            <View
                style={{
                    backgroundColor: theme.sidebarBg,
                    flex: 1,
                    marginTop: 20
                }}
            >
                <Text style={{height: 60, width: 100, color: theme.sidebarText}}>{this.props.currentTeam.name}</Text>
                {favoriteChannels}
                {publicChannels}
                {privateChannels}
                {directChannels}
                {directNonTeamChannels}
            </View>
        );
    }
}
