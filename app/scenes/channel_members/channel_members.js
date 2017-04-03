// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PropTypes, PureComponent} from 'react';
import {
    Alert,
    Keyboard,
    Platform,
    InteractionManager,
    StyleSheet,
    View
} from 'react-native';
import {injectIntl, intlShape} from 'react-intl';

import MemberList from 'app/components/custom_list';
import SearchBar from 'app/components/search_bar';
import {createMembersSections, loadingText} from 'app/utils/member_list';
import MemberListRow from 'app/components/custom_list/member_list_row';
import {displayUsername} from 'mattermost-redux/utils/user_utils';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

import {Constants, RequestStatus} from 'mattermost-redux/constants';
import EventEmitter from 'mattermost-redux/utils/event_emitter';

import ChannelMembersTitle from './channel_members_title';
import RemoveMemberButton from './remove_member_button';

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
        searchRequestStatus: PropTypes.string,
        removeMembersStatus: PropTypes.string,
        canManageUsers: PropTypes.bool.isRequired,
        subscribeToHeaderEvent: React.PropTypes.func,
        unsubscribeFromHeaderEvent: React.PropTypes.func,
        actions: PropTypes.shape({
            getProfilesInChannel: PropTypes.func.isRequired,
            goBack: PropTypes.func.isRequired,
            handleRemoveChannelMembers: PropTypes.func.isRequired,
            searchProfiles: PropTypes.func.isRequired
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
        profiles: [],
        selectedMembers: {}
    };

    componentWillMount() {
        this.props.subscribeToHeaderEvent('remove_members', this.handleRemoveMembersPress);
    }

    componentDidMount() {
        if (Platform.OS === 'android') {
            Keyboard.addListener('keyboardDidHide', this.handleAndroidKeyboard);
        }

        InteractionManager.runAfterInteractions(() => {
            this.props.actions.getProfilesInChannel(this.props.currentTeam.id, this.props.currentChannel.id, 0);
        });

        this.emitCanRemoveMembers(false);
    }

    componentWillUnmount() {
        this.props.unsubscribeFromHeaderEvent('remove_members');

        if (Platform.OS === 'android') {
            Keyboard.removeListener('keyboardDidHide', this.handleAndroidKeyboard);
        }
    }

    componentWillReceiveProps(nextProps) {
        const {requestStatus} = this.props;
        if (requestStatus === RequestStatus.STARTED &&
            nextProps.requestStatus === RequestStatus.SUCCESS) {
            this.setState({profiles: nextProps.currentChannelMembers});
        } else if (this.state.searching &&
            nextProps.searchRequestStatus === RequestStatus.SUCCESS) {
            const results = nextProps.currentChannelMembers.filter((p) => {
                const {term} = this.state;
                return p.username.toLowerCase().includes(term) || p.email.toLowerCase().includes(term) ||
                    p.first_name.toLowerCase().includes(term) || p.last_name.toLowerCase().includes(term);
            });
            this.setState({profiles: results});
        }

        const {removeMembersStatus} = nextProps;

        if (this.props.removeMembersStatus !== removeMembersStatus) {
            switch (removeMembersStatus) {
            case RequestStatus.STARTED:
                this.emitRemoving(true);
                this.setState({error: null});
                break;
            case RequestStatus.SUCCESS:
                this.emitRemoving(false);
                this.setState({error: null});
                this.props.actions.goBack();
                break;
            case RequestStatus.FAILURE:
                this.emitRemoving(false);
                break;
            }
        }
    }

    handleRemoveMembersPress = () => {
        const {selectedMembers} = this.state;
        const membersToRemove = Object.keys(selectedMembers).filter((m) => selectedMembers[m]);

        const {formatMessage} = this.props.intl;
        if (!membersToRemove.length) {
            Alert.alert(
                formatMessage({
                    id: 'mobile.routes.channel_members.action',
                    defaultMessage: 'Remove Members'
                }),
                formatMessage({
                    id: 'mobile.routes.channel_members.action_message',
                    defaultMessage: 'You must select at least one member to remove from the channel.'
                })
            );
            return;
        }

        Alert.alert(
            formatMessage({
                id: 'mobile.routes.channel_members.action',
                defaultMessage: 'Remove Members'
            }),
            formatMessage({
                id: 'mobile.routes.channel_members.action_message_confirm',
                defaultMessage: 'Are you sure you want to remove the selected members from the channel?'
            }),
            [{
                text: formatMessage({id: 'mobile.channel_list.alertNo', defaultMessage: 'No'})
            }, {
                text: formatMessage({id: 'mobile.channel_list.alertYes', defaultMessage: 'Yes'}),
                onPress: () => this.removeMembers(membersToRemove)
            }]
        );
    };

    handleAndroidKeyboard = () => {
        this.onSearchButtonPress();
    };

    removeMembers = (membersToRemove) => {
        const {actions, currentTeam, currentChannel} = this.props;
        actions.handleRemoveChannelMembers(currentTeam.id, currentChannel.id, membersToRemove);
    };

    loadMoreMembers = () => {
        if (this.props.requestStatus !== 'started' && this.props.currentChannelMembers.length < this.props.currentChannelMemberCount - 1) {
            this.props.actions.getProfilesInChannel(this.props.currentTeam.id, this.props.currentChannel.id, this.props.currentChannelMembers.length);
        }
    };

    handleRowSelect = (id) => {
        const selectedMembers = Object.assign({}, this.state.selectedMembers, {[id]: !this.state.selectedMembers[id]});
        if (Object.values(selectedMembers).filter((selected) => selected).length) {
            this.emitCanRemoveMembers(true);
        } else {
            this.emitCanRemoveMembers(false);
        }
        this.setState({
            selectedMembers
        });
    };

    emitCanRemoveMembers = (enabled) => {
        EventEmitter.emit('can_remove_members', enabled);
    };

    emitRemoving = (loading) => {
        EventEmitter.emit('removing_members', loading);
    };

    searchBarRef = (ref) => {
        this.searchBar = ref;
    };

    onSearchButtonPress = () => {
        this.searchBar.blur();
    };

    searchProfiles = (event) => {
        const term = event.nativeEvent.text.toLowerCase();

        if (term) {
            this.setState({searching: true, term});
            clearTimeout(this.searchTimeoutId);

            this.searchTimeoutId = setTimeout(() => {
                this.props.actions.searchProfiles(term, {in_channel_id: this.props.currentChannel.id});
            }, Constants.SEARCH_TIMEOUT_MILLISECONDS);
        } else {
            this.cancelSearch();
        }
    };

    cancelSearch = () => {
        this.setState({
            searching: false,
            term: null,
            page: 0,
            profiles: this.props.currentChannelMembers
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
    };

    render() {
        const {canManageUsers, intl, preferences, requestStatus, searchRequestStatus, theme} = this.props;
        const {formatMessage} = intl;
        const {profiles, searching} = this.state;
        const isLoading = (requestStatus === RequestStatus.STARTED) ||
            (searchRequestStatus === RequestStatus.STARTED);
        const more = searching ? () => true : this.loadMoreMembers;
        const style = getStyleFromTheme(theme);

        return (
            <View style={style.container}>
                <View
                    style={{marginVertical: 5}}
                >
                    <SearchBar
                        ref={this.searchBarRef}
                        placeholder={formatMessage({id: 'search_bar.search', defaultMesage: 'Search'})}
                        height={27}
                        fontSize={14}
                        textColor={theme.centerChannelColor}
                        hideBackground={true}
                        textFieldBackgroundColor={changeOpacity(theme.centerChannelColor, 0.07)}
                        onChange={this.searchProfiles}
                        onSearchButtonPress={this.onSearchButtonPress}
                        onCancelButtonPress={this.cancelSearch}
                    />
                </View>
                <MemberList
                    data={profiles}
                    theme={theme}
                    searching={searching}
                    onListEndReached={more}
                    preferences={preferences}
                    listScrollRenderAheadDistance={50}
                    loading={isLoading}
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

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: theme.centerChannelBg
        }
    });
});

export default injectIntl(ChannelMembers);
