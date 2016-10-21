// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {Component, PropTypes} from 'react';
import {View, Text} from 'react-native';
import {Actions as Routes} from 'react-native-router-flux';
import Button from 'react-native-button';
import _ from 'lodash';

import ErrorText from 'components/error_text';
import FormattedText from 'components/formatted_text';
import {GlobalStyles} from 'styles';

const propTypes = {
    team: PropTypes.object.isRequired,
    channel: PropTypes.object.isRequired,
    actions: PropTypes.object.isRequired
};

class ChannelsListView extends Component {
    static propTypes = propTypes;

    componentWillMount() {
        this.props.actions.fetchChannels();
    }

    componentWillReceiveProps(nextProps) {
        const {currentChannelId} = nextProps.channel;
        if (currentChannelId &&
          currentChannelId !== this.props.channel.currentChannelId) {
            Routes.goToPostsList();
        }
    }

    render() {
        const {data: teams, currentTeamId} = this.props.team;
        const currentTeam = teams[currentTeamId];
        const channels = _.values(this.props.channel.data);
        return (
            <View style={GlobalStyles.container}>
                <Text style={GlobalStyles.header}>
                    {currentTeam.display_name}
                </Text>
                <FormattedText
                    style={GlobalStyles.subheader}
                    id='mobile.components.channels_list_view.yourChannels'
                    defaultMessage='Your channels:'
                />
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

                <ErrorText error={this.props.channel.error}/>
            </View>
        );
    }
}

export default ChannelsListView;
