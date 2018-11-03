// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import PropTypes from 'prop-types';
import {Text} from 'react-native';

import {getChannelFromChannelName} from './channel_link_utils';

import CustomPropTypes from 'app/constants/custom_prop_types';

export default class ChannelLink extends React.PureComponent {
    static propTypes = {
        channelName: PropTypes.string.isRequired,
        linkStyle: CustomPropTypes.Style,
        onChannelLinkPress: PropTypes.func,
        textStyle: CustomPropTypes.Style,
        channelsByName: PropTypes.object.isRequired,
        actions: PropTypes.shape({
            switchToChannel: PropTypes.func.isRequired,
        }).isRequired,
    };

    constructor(props) {
        super(props);

        this.state = {
            channel: getChannelFromChannelName(props.channelName, props.channelsByName),
        };
    }

    static getDerivedStateFromProps(nextProps, prevState) {
        const nextChannel = getChannelFromChannelName(nextProps.channelName, nextProps.channelsByName);
        if (nextChannel !== prevState.channel) {
            return {channel: nextChannel};
        }

        return null;
    }

    handlePress = () => {
        this.props.actions.switchToChannel(this.state.channel.id, this.state.channel.display_name);

        if (this.props.onChannelLinkPress) {
            this.props.onChannelLinkPress(this.state.channel);
        }
    }

    render() {
        const channel = this.state.channel;

        if (!channel) {
            return <Text style={this.props.textStyle}>{`~${this.props.channelName}`}</Text>;
        }

        const suffix = this.props.channelName.substring(channel.name.length);

        return (
            <Text style={this.props.textStyle}>
                <Text
                    style={this.props.linkStyle}
                    onPress={this.handlePress}
                >
                    {`~${channel.display_name}`}
                </Text>
                {suffix}
            </Text>
        );
    }
}
