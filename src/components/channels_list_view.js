// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {Component, PropTypes} from 'react';
import {View, Text} from 'react-native';
import {Actions as Routes} from 'react-native-router-flux';
import Button from 'react-native-button';
import _ from 'lodash';

import ErrorText from 'components/error_text';
import {GlobalStyles} from 'styles';

const propTypes = {
    teams: PropTypes.object.isRequired,
    channels: PropTypes.object.isRequired,
    actions: PropTypes.object.isRequired
};

class ChannelsListView extends Component {
    static propTypes = propTypes;

    componentWillMount() {
        this.props.actions.fetchChannels();
    }

    componentWillReceiveProps(props) {
        const {currentChannelId} = props.channels;
        if (currentChannelId &&
          currentChannelId !== this.props.channels.currentChannelId) {
            Routes.goToPostsList();
        }
    }

    render() {
        const {data: teams, currentTeamId} = this.props.teams;
        const currentTeam = teams[currentTeamId];
        const channels = _.values(this.props.channels.data);
        return (
            <View style={GlobalStyles.container}>
                <Text style={GlobalStyles.header}>
                    {currentTeam.display_name}
                </Text>
                <Text style={GlobalStyles.subheader}>
                    {'Your channels:'}
                </Text>
                {_.map(channels, (channel) => (
                    <Button
                        key={channel.id}
                        onPress={() => this.props.actions.selectChannel(channel)}
                        style={GlobalStyles.buttonListItemText}
                        containerStyle={GlobalStyles.buttonListItem}
                    >
                        {channel.display_name}
                    </Button>
                ))}

                <ErrorText error={this.props.channels.error}/>
            </View>
        );
    }
}

export default ChannelsListView;
