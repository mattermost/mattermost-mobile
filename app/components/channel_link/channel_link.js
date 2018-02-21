// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';
import PropTypes from 'prop-types';
import {Text} from 'react-native';

import CustomPropTypes from 'app/constants/custom_prop_types';

export default class ChannelLink extends React.PureComponent {
    static propTypes = {
        channelName: PropTypes.string.isRequired,
        linkStyle: CustomPropTypes.Style,
        textStyle: CustomPropTypes.Style,
        channelsByName: PropTypes.object.isRequired,
        actions: PropTypes.shape({
            handleSelectChannel: PropTypes.func.isRequired,
            setChannelDisplayName: PropTypes.func.isRequired,
        }).isRequired,
    };

    constructor(props) {
        super(props);

        this.state = {
            channel: this.getChannelFromChannelName(props),
        };
    }

    componentWillReceiveProps(nextProps) {
        if (nextProps.channelName !== this.props.channelName || nextProps.channelsByName !== this.props.channelsByName) {
            this.setState({
                channel: this.getChannelFromChannelName(nextProps),
            });
        }
    }

    getChannelFromChannelName(props) {
        let channelName = props.channelName;

        while (channelName.length > 0) {
            if (props.channelsByName[channelName]) {
                return props.channelsByName[channelName];
            }

            // Repeatedly trim off trailing punctuation in case this is at the end of a sentence
            if ((/[_-]$/).test(channelName)) {
                channelName = channelName.substring(0, channelName.length - 1);
            } else {
                break;
            }
        }

        return null;
    }

    handlePress = () => {
        this.props.actions.setChannelDisplayName(this.state.channel.display_name);
        this.props.actions.handleSelectChannel(this.state.channel.id);
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
