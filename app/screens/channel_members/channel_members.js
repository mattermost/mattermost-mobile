// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PropTypes, PureComponent} from 'react';
import {
    Alert,
    Keyboard,
    Platform,
    InteractionManager,
    StatusBar,
    StyleSheet,
    View
} from 'react-native';
import {injectIntl, intlShape} from 'react-intl';

import ActionButton from 'app/components/action_button';
import BackButton from 'app/components/back_button';
import FormattedText from 'app/components/formatted_text';
import MemberList from 'app/components/custom_list';
import NavBar from 'app/components/nav_bar';
import SearchBar from 'app/components/search_bar';
import {createMembersSections, loadingText, markSelectedProfiles} from 'app/utils/member_list';
import MemberListRow from 'app/components/custom_list/member_list_row';
import {preventDoubleTap} from 'app/utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

import {General, RequestStatus} from 'mattermost-redux/constants';
import EventEmitter from 'mattermost-redux/utils/event_emitter';
import {displayUsername, filterProfilesMatchingTerm} from 'mattermost-redux/utils/user_utils';

class ChannelMembers extends PureComponent {
    static propTypes = {
        intl: intlShape.isRequired,
        theme: PropTypes.object.isRequired,
        currentChannel: PropTypes.object,
        currentChannelMembers: PropTypes.array.isRequired,
        currentChannelMemberCount: PropTypes.number.isRequired,
        currentUserId: PropTypes.string.isRequired,
        navigator: PropTypes.object,
        preferences: PropTypes.object,
        requestStatus: PropTypes.string,
        searchRequestStatus: PropTypes.string,
        removeMembersStatus: PropTypes.string,
        canManageUsers: PropTypes.bool.isRequired,
        actions: PropTypes.shape({
            getProfilesInChannel: PropTypes.func.isRequired,
            handleRemoveChannelMembers: PropTypes.func.isRequired,
            searchProfiles: PropTypes.func.isRequired
        })
    };

    constructor(props) {
        super(props);

        this.searchTimeoutId = 0;

        this.state = {
            canSelect: true,
            next: true,
            page: 0,
            profiles: [],
            searching: false,
            selectedMembers: {},
            showNoResults: false
        };
    }

    componentWillMount() {
        EventEmitter.on('remove_members', this.handleRemoveMembersPress);
    }

    componentDidMount() {
        if (Platform.OS === 'android') {
            Keyboard.addListener('keyboardDidHide', this.handleAndroidKeyboard);
        }

        InteractionManager.runAfterInteractions(() => {
            this.props.actions.getProfilesInChannel(this.props.currentChannel.id, 0);
        });

        this.emitCanRemoveMembers(false);
    }

    componentWillUnmount() {
        EventEmitter.off('remove_members', this.handleRemoveMembersPress);

        if (Platform.OS === 'android') {
            Keyboard.removeListener('keyboardDidHide', this.handleAndroidKeyboard);
        }
    }

    componentWillReceiveProps(nextProps) {
        const {requestStatus} = this.props;
        if (requestStatus === RequestStatus.STARTED &&
            nextProps.requestStatus === RequestStatus.SUCCESS) {
            const {page} = this.state;
            const profiles = markSelectedProfiles(
                nextProps.currentChannelMembers.splice(0, (page + 1) * General.PROFILE_CHUNK_SIZE),
                this.state.selectedMembers
            );
            this.setState({profiles, showNoResults: true});
        } else if (this.state.searching &&
            nextProps.searchRequestStatus === RequestStatus.SUCCESS) {
            const results = markSelectedProfiles(
                filterProfilesMatchingTerm(nextProps.currentChannelMembers, this.state.term),
                this.state.selectedMembers
            );
            this.setState({profiles: results, showNoResults: true});
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
                this.close();
                break;
            case RequestStatus.FAILURE:
                this.emitRemoving(false);
                break;
            }
        }
    }

    cancelSearch = () => {
        this.setState({
            searching: false,
            term: null,
            page: 0,
            profiles: markSelectedProfiles(this.props.currentChannelMembers, this.state.selectedMembers)
        });
    };

    close = () => {
        this.props.navigator.pop({animated: true});
    };

    emitCanRemoveMembers = (enabled) => {
        EventEmitter.emit('can_remove_members', enabled);
    };

    emitRemoving = (loading) => {
        this.setState({canSelect: false});
        EventEmitter.emit('removing_members', loading);
    };

    handleAndroidKeyboard = () => {
        this.onSearchButtonPress();
    };

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

    handleRowSelect = (id) => {
        const selectedMembers = Object.assign({}, this.state.selectedMembers, {[id]: !this.state.selectedMembers[id]});
        if (Object.values(selectedMembers).filter((selected) => selected).length) {
            this.emitCanRemoveMembers(true);
        } else {
            this.emitCanRemoveMembers(false);
        }
        this.setState({
            profiles: markSelectedProfiles(this.state.profiles, selectedMembers),
            selectedMembers
        });
    };

    loadMoreMembers = () => {
        const {actions, requestStatus, currentChannel} = this.props;
        const {next, searching} = this.state;
        let {page} = this.state;
        if (requestStatus !== RequestStatus.STARTED && next && !searching) {
            page = page + 1;
            actions.getProfilesInChannel(currentChannel.id, page, General.PROFILE_CHUNK_SIZE).
            then((data) => {
                if (data && data.length) {
                    this.setState({
                        page
                    });
                } else {
                    this.setState({next: false});
                }
            });
        }
    };

    onSearchButtonPress = () => {
        this.searchBar.blur();
    };

    removeMembers = (membersToRemove) => {
        const {actions, currentChannel} = this.props;
        actions.handleRemoveChannelMembers(currentChannel.id, membersToRemove);
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

    searchBarRef = (ref) => {
        this.searchBar = ref;
    };

    searchProfiles = (event) => {
        const term = event.nativeEvent.text.toLowerCase();

        if (term) {
            this.setState({searching: true, term});
            clearTimeout(this.searchTimeoutId);

            this.searchTimeoutId = setTimeout(() => {
                this.props.actions.searchProfiles(term, {in_channel_id: this.props.currentChannel.id});
            }, General.SEARCH_TIMEOUT_MILLISECONDS);
        } else {
            this.cancelSearch();
        }
    };

    render() {
        const {canManageUsers, intl, preferences, requestStatus, searchRequestStatus, theme} = this.props;
        const {formatMessage} = intl;
        const {profiles, searching, showNoResults} = this.state;
        const isLoading = (requestStatus === RequestStatus.STARTED) || (requestStatus.status === RequestStatus.NOT_STARTED) ||
            (searchRequestStatus === RequestStatus.STARTED);
        const more = searching ? () => true : this.loadMoreMembers;
        const style = getStyleFromTheme(theme);

        const navbarLeft = (
            <BackButton
                color={theme.sidebarHeaderTextColor}
                onPress={() => preventDoubleTap(this.close, this)}
                style={style.left}
            />
        );

        const navbarTitle = (
            <FormattedText
                id={canManageUsers ? 'channel_header.manageMembers' : 'channel_header.viewMembers'}
                defaultMessage={canManageUsers ? 'Manage Members' : 'View Members'}
                style={[style.navTitle, {color: theme.sidebarHeaderTextColor}]}
            />
        );

        let navbarRight;
        if (canManageUsers) {
            navbarRight = (
                <ActionButton
                    actionEventName='remove_members'
                    enabled={false}
                    enableEventName='can_remove_members'
                    labelDefaultMessage='Remove'
                    labelId='channel_members_modal.remove'
                    loadingEventName='removing_members'
                />
            );
        }
        return (
            <View style={style.container}>
                <StatusBar barStyle='light-content'/>
                <NavBar
                    left={navbarLeft}
                    title={navbarTitle}
                    right={navbarRight}
                />
                <View
                    style={{marginVertical: 5}}
                >
                    <SearchBar
                        ref={this.searchBarRef}
                        placeholder={formatMessage({id: 'search_bar.search', defaultMesage: 'Search'})}
                        height={27}
                        fontSize={14}
                        textColor={changeOpacity('#000', 0.5)}
                        hideBackground={true}
                        textFieldBackgroundColor={'#fff'}
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
                    selectable={canManageUsers && this.state.canSelect}
                    onRowSelect={this.handleRowSelect}
                    renderRow={this.renderMemberRow}
                    createSections={createMembersSections}
                    showNoResults={showNoResults}
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
        },
        navTitle: {
            ...Platform.select({
                android: {
                    fontSize: 18
                },
                ios: {
                    fontSize: 15,
                    fontWeight: 'bold'
                }
            })
        }
    });
});

export default injectIntl(ChannelMembers);
