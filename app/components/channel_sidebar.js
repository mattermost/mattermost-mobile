// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';

import {Text, View} from 'react-native';

class ChannelSidebar extends React.Component {
    static propTypes = {
        actions: React.PropTypes.shape({
            selectChannel: React.PropTypes.func.isRequired
        }).isRequired,
        currentTeam: React.PropTypes.object.isRequired,
        channels: React.PropTypes.arrayOf(React.PropTypes.object).isRequired
    };

    onSelectChannel = (channel) => {
        console.log('clicked channel ' + channel.name); // eslint-disable-line no-console

        this.props.actions.selectChannel(channel.id);
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

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {selectChannel} from 'service/actions/channels';

function mapStateToProps(state, ownProps) {
    return ownProps;
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            selectChannel
        }, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(ChannelSidebar);
