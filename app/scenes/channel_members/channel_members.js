// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PropTypes, PureComponent} from 'react';
import {
    Alert,
    InteractionManager,
    StyleSheet,
    View
} from 'react-native';
import {injectIntl, intlShape} from 'react-intl';

import MemberList from 'app/components/member_list';

import ChannelMembersTitle from './channel_members_title';
import RemoveMemberButton from './remove_member_button';

const style = StyleSheet.create({
    container: {
        flex: 1
    }
});

class ChannelMembers extends PureComponent {
    static propTypes = {
        intl: intlShape.isRequired,
        currentChannel: PropTypes.object,
        currentChannelMembers: PropTypes.array.isRequired,
        currentChannelMemberCount: PropTypes.number.isRequired,
        currentTeam: PropTypes.object,
        preferences: PropTypes.object,
        requestStatus: PropTypes.string,
        isAdmin: PropTypes.bool.isRequired,
        subscribeToHeaderEvent: React.PropTypes.func,
        unsubscribeFromHeaderEvent: React.PropTypes.func,
        actions: PropTypes.shape({
            getProfilesInChannel: PropTypes.func.isRequired,
            goBack: PropTypes.func.isRequired,
            handleRemoveChannelMembers: PropTypes.func.isRequired
        })
    }

    static navigationProps = {
        renderTitleComponent: () => {
            return <ChannelMembersTitle/>;
        },
        renderRightComponent: (props, emitter) => {
            return <RemoveMemberButton emitter={emitter}/>;
        }
    }

    state = {
        selectedMembers: {}
    }

    componentWillMount() {
        this.props.subscribeToHeaderEvent('remove_members', this.handleRemoveMembersPress);
    }

    componentDidMount() {
        InteractionManager.runAfterInteractions(() => {
            this.props.actions.getProfilesInChannel(this.props.currentTeam.id, this.props.currentChannel.id, 0);
        });
    }

    componentWillUnmount() {
        this.props.unsubscribeFromHeaderEvent('remove_members');
    }

    handleRemoveMembersPress = () => {
        const {selectedMembers} = this.state;
        const membersToRemove = Object.keys(selectedMembers).filter((m) => selectedMembers[m]);

        const {formatMessage} = this.props.intl;
        if (!membersToRemove.length) {
            Alert.alert(
                formatMessage({
                    id: 'mobile.routes.channel_members.action',
                    defaultMessage: '{term} Members'
                }, {
                    term: 'Remove'
                }),
                formatMessage({
                    id: 'mobile.routes.channel_members.action_message',
                    defaultMessage: 'You must select at least one member to {term} {prep} the channel.'
                }, {
                    term: 'remove',
                    prep: 'from'
                })
            );
            return;
        }

        Alert.alert(
            formatMessage({
                id: 'mobile.routes.channel_members.action',
                defaultMessage: '{term} Members'
            }, {
                term: 'Remove'
            }),
            formatMessage({
                id: 'mobile.routes.channel_members.action_message_confirm',
                defaultMessage: 'Are you sure you want to {term} the selected members {prep} the channel?'
            }, {
                term: 'remove',
                prep: 'from'
            }),
            [{
                text: formatMessage({id: 'mobile.channel_list.alertNo', defaultMessage: 'No'})
            }, {
                text: formatMessage({id: 'mobile.channel_list.alertYes', defaultMessage: 'Yes'}),
                onPress: () => this.removeMembers(membersToRemove)
            }]
        );
    }

    removeMembers = (membersToRemove) => {
        const {actions, currentTeam, currentChannel} = this.props;
        actions.handleRemoveChannelMembers(currentTeam.id, currentChannel.id, membersToRemove).then(() => {
            actions.goBack();
        });
    }

    loadMoreMembers = () => {
        if (this.props.requestStatus !== 'started' && this.props.currentChannelMembers.length < this.props.currentChannelMemberCount) {
            this.props.actions.getProfilesInChannel(this.props.currentTeam.id, this.props.currentChannel.id, this.props.currentChannelMembers.length);
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
                    members={this.props.currentChannelMembers}
                    onListEndReached={this.loadMoreMembers}
                    preferences={this.props.preferences}
                    loadingMembers={this.props.requestStatus === 'started'}
                    selectable={this.props.isAdmin}
                    onRowSelect={this.handleRowSelect}
                />
            </View>
        );
    }
}

export default injectIntl(ChannelMembers);
