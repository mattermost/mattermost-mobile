// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';

// import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {Text, View} from 'react-native';

class ChannelSidebar extends React.Component {
    static propTypes = {
        currentTeam: React.PropTypes.object.isRequired,
        channels: React.PropTypes.array.isRequired,
        onSelectChannel: React.PropTypes.func
    };

    onSelectChannel = (channel) => {
        console.log('clicked channel ' + channel.name); // eslint-disable-line no-console

        // this.props.onSelectChannel(channel);
    }

    render() {
        const channels = this.props.channels.map((channel) => {
            return (
                <Text
                    key={channel.id}
                    style={{height: 30, width: 100}}
                    onPress={() => this.onSelectChannel(channel)}
                >
                    {channel.name}
                </Text>
            );
        });

        return (
            <View
                style={{
                    backgroundColor: 'gray',
                    flex: 1,
                    paddingTop: 20
                }}
            >
                <Text style={{height: 60, width: 100}}>{this.props.currentTeam.name}</Text>
                {channels}
            </View>
        );
    }
}

function mapStateToProps(state, ownProps) {
    return {
        ...ownProps,
        channels: Object.keys(state.entities.channel.channelIdsByTeamId[ownProps.currentTeam.id] || {}).map((channelId) => state.entities.channel.channels[channelId])
    };
}

export default connect(mapStateToProps)(ChannelSidebar);
