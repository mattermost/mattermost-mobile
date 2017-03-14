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

import MemberList from 'app/components/custom_list';
import {createMembersSections, loadingText} from 'app/utils/member_list';
import MemberListRow from 'app/components/custom_list/member_list_row';
import {displayUsername} from 'mattermost-redux/utils/user_utils';
import {makeStyleSheetFromTheme} from 'app/utils/theme';

import ChannelMembersTitle from './channel_members_title';
import RemoveMemberButton from './remove_member_button';

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: theme.centerChannelBg
        }
    });
});

class ChannelMembers extends PureComponent {
    static propTypes = {
        intl: intlShape.isRequired,
        theme: PropTypes.object.isRequired,
        currentChannel: PropTypes.object,
        currentChannelMembers: PropTypes.array.isRequired,
        currentChannelMemberCount: PropTypes.number.isRequired,
        currentUserId: PropTypes.string.isRequired,
        currentTeam: PropTypes.object,
        preferences: PropTypes.object,
        requestStatus: PropTypes.string,
        canManageUsers: PropTypes.bool.isRequired,
        subscribeToHeaderEvent: React.PropTypes.func,
        unsubscribeFromHeaderEvent: React.PropTypes.func,
        actions: PropTypes.shape({
            getProfilesInChannel: PropTypes.func.isRequired,
            goBack: PropTypes.func.isRequired,
            handleRemoveChannelMembers: PropTypes.func.isRequired
        })
    };

    static navigationProps = {
        renderTitleComponent: () => {
            return <ChannelMembersTitle/>;
        },
        renderRightComponent: (props, emitter) => {
            return <RemoveMemberButton emitter={emitter}/>;
        }
    };

    state = {
        selectedMembers: {}
    };

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
    };

    removeMembers = (membersToRemove) => {
        const {actions, currentTeam, currentChannel} = this.props;
        actions.handleRemoveChannelMembers(currentTeam.id, currentChannel.id, membersToRemove).then(() => {
            actions.goBack();
        });
    };

    loadMoreMembers = () => {
        if (this.props.requestStatus !== 'started' && this.props.currentChannelMembers.length < this.props.currentChannelMemberCount) {
            this.props.actions.getProfilesInChannel(this.props.currentTeam.id, this.props.currentChannel.id, this.props.currentChannelMembers.length);
        }
    };

    handleRowSelect = (id) => {
        const selectedMembers = Object.assign({}, this.state.selectedMembers, {[id]: !this.state.selectedMembers[id]});
        this.setState({
            selectedMembers
        });
    };

    renderMemberRow = (user, sectionId, rowId, preferences, theme, selectable, onPress, onSelect) => {
        const {id, username} = user;
        const displayName = displayUsername(user, preferences);
        let onRowSelect = null;
        if (selectable) {
            onRowSelect = () => onSelect(sectionId, rowId);
        }

        const disableSelect = user.id === this.props.currentUserId;

        return (
            <MemberListRow
                id={id}
                user={user}
                displayName={displayName}
                username={username}
                theme={theme}
                onPress={onPress}
                selectable={selectable}
                selected={user.selected}
                onRowSelect={onRowSelect}
                disableSelect={disableSelect}
            />
        );
    }

    render() {
        const {canManageUsers, theme} = this.props;
        const style = getStyleFromTheme(theme);

        return (
            <View style={style.container}>
                <MemberList
                    data={this.props.currentChannelMembers}
                    theme={this.props.theme}
                    onListEndReached={this.loadMoreMembers}
                    preferences={this.props.preferences}
                    loading={this.props.requestStatus === 'started'}
                    loadingText={loadingText}
                    selectable={canManageUsers}
                    onRowSelect={this.handleRowSelect}
                    renderRow={this.renderMemberRow}
                    createSections={createMembersSections}
                />
            </View>
        );
    }
}

export default injectIntl(ChannelMembers);
