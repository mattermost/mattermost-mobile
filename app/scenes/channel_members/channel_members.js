// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PropTypes, PureComponent} from 'react';
import {
    InteractionManager,
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
        currentChannelMemberCount: PropTypes.number.isRequired,
        currentTeam: PropTypes.object,
        preferences: PropTypes.object,
        requestStatus: PropTypes.string,
        actions: PropTypes.shape({
            getProfilesInChannel: PropTypes.func.isRequired
        })
    }

    componentDidMount() {
        InteractionManager.runAfterInteractions(() => {
            this.props.actions.getProfilesInChannel(this.props.currentTeam.id, this.props.currentChannel.id, 0);
        });
    }

    loadMoreMembers = () => {
        if (this.props.requestStatus !== 'started' && this.props.currentChannelMembers.length < this.props.currentChannelMemberCount) {
            this.props.actions.getProfilesInChannel(this.props.currentTeam.id, this.props.currentChannel.id, this.props.currentChannelMembers.length);
        }
    }

    render() {
        return (
            <View style={style.container}>
                <MemberList
                    members={this.props.currentChannelMembers}
                    onListEndReached={this.loadMoreMembers}
                    preferences={this.props.preferences}
                    loadingMembers={this.props.requestStatus === 'started'}
                />
            </View>
        );
    }
}
