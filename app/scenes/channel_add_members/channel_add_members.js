// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PropTypes, PureComponent} from 'react';
import {
    Alert,
    InteractionManager,
    StyleSheet,
    View
} from 'react-native';

import MemberList from 'app/components/member_list';

import AddMemberButton from './add_member_button';

const style = StyleSheet.create({
    container: {
        flex: 1
    }
});

export default class ChannelAddMembers extends PureComponent {
    static propTypes = {
        currentChannel: PropTypes.object,
        currentChannelMemberCount: PropTypes.number,
        membersNotInChannel: PropTypes.array.isRequired,
        currentTeam: PropTypes.object,
        currentTeamMemberCount: PropTypes.number,
        preferences: PropTypes.object,
        loadMoreRequestStatus: PropTypes.string,
        subscribeToHeaderEvent: React.PropTypes.func,
        unsubscribeFromHeaderEvent: React.PropTypes.func,
        actions: PropTypes.shape({
            getTeamStats: PropTypes.func.isRequired,
            getProfilesNotInChannel: PropTypes.func.isRequired,
            goBack: PropTypes.func.isRequired,
            handleAddChannelMembers: PropTypes.func.isRequired
        })
    }

    static navigationProps = {
        renderRightComponent: (props, emitter) => {
            return <AddMemberButton emitter={emitter}/>;
        }
    }

    state = {
        selectedMembers: {}
    }

    componentWillMount() {
        this.props.subscribeToHeaderEvent('add_members', this.handleAddMembersPress);
    }

    componentDidMount() {
        InteractionManager.runAfterInteractions(() => {
            this.props.actions.getProfilesNotInChannel(this.props.currentTeam.id, this.props.currentChannel.id, 0);
            this.props.actions.getTeamStats(this.props.currentTeam.id);
        });
    }

    componentWillUnmount() {
        this.props.unsubscribeFromHeaderEvent('add_members');
    }

    handleAddMembersPress = () => {
        const {selectedMembers} = this.state;
        const {actions, currentTeam, currentChannel} = this.props;
        const membersToAdd = Object.keys(selectedMembers).filter((m) => selectedMembers[m]);

        if (!membersToAdd.length) {
            Alert.alert('Add Members', 'You must select at least one member to add to the channel.');
            return;
        }

        actions.handleAddChannelMembers(currentTeam.id, currentChannel.id, membersToAdd).then(() => {
            actions.goBack();
        });
    }

    loadMoreMembers = () => {
        const {currentChannelMemberCount, currentTeamMemberCount, membersNotInChannel, loadMoreRequestStatus} = this.props;
        if (loadMoreRequestStatus !== 'started' && membersNotInChannel.length < (currentTeamMemberCount - currentChannelMemberCount - 1)) {
            this.props.actions.getProfilesNotInChannel(this.props.currentTeam.id, this.props.currentChannel.id, this.props.membersNotInChannel.length);
        }
    }

    handleRowSelect = (id) => {
        const selectedMembers = Object.assign({}, this.state.selectedMembers, {[id]: !this.state.selectedMembers[id]});
        this.setState({
            selectedMembers
        });
    }

    render() {
        return (
            <View style={style.container}>
                <MemberList
                    members={this.props.membersNotInChannel}
                    onListEndReached={this.loadMoreMembers}
                    preferences={this.props.preferences}
                    loadingMembers={this.props.loadMoreRequestStatus === 'started'}
                    selectable={true}
                    onRowSelect={this.handleRowSelect}
                    showSections={true}
                />
            </View>
        );
    }
}
