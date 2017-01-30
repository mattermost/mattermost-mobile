// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PropTypes, PureComponent} from 'react';
import {
    StyleSheet,
    View
} from 'react-native';

import MemberList from 'app/components/member_list';

const style = StyleSheet.create({
    container: {
        flex: 1
    }
});

export default class ChannelMembers extends PureComponent {
    static propTypes = {
        currentChannel: PropTypes.object,
        currentChannelMembers: PropTypes.array.isRequired,
        currentTeam: PropTypes.object,
        preferences: PropTypes.object,
        actions: PropTypes.shape({
            getProfilesInChannel: PropTypes.func.isRequired
        })
    }

    state = {
        currentChannelMemberCount: 0
    }

    componentDidMount() {
        this.props.actions.getProfilesInChannel(this.props.currentTeam.id, this.props.currentChannel.id, 0);
    }

    componentWillReceiveProps(nextProps) {
        this.setState({
            currentChannelMemberCount: this.state.currentChannelMemberCount + nextProps.currentChannelMembers.length
        });
    }

    loadMoreMembers = () => {
        this.props.actions.getProfilesInChannel(this.props.currentTeam.id, this.props.currentChannel.id, this.state.currentChannelMemberCount);
    }

    render() {
        return (
            <View style={style.container}>
                <MemberList
                    members={this.props.currentChannelMembers}
                    onListEndReached={this.loadMoreMembers}
                    preferences={this.props.preferences}
                />
            </View>
        );
    }
}
