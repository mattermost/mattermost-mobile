// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PropTypes, PureComponent} from 'react';
import {injectIntl, intlShape} from 'react-intl';
import {
    Alert,
    Keyboard,
    Platform,
    InteractionManager,
    StyleSheet,
    View
} from 'react-native';

import ActionButton from 'app/components/action_button';
import MemberList from 'app/components/custom_list';
import SearchBar from 'app/components/search_bar';
import {createMembersSections, loadingText, renderMemberRow} from 'app/utils/member_list';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

import {Constants, RequestStatus} from 'mattermost-redux/constants';
import EventEmitter from 'mattermost-redux/utils/event_emitter';

class ChannelAddMembers extends PureComponent {
    static propTypes = {
        intl: intlShape.isRequired,
        theme: PropTypes.object.isRequired,
        currentChannel: PropTypes.object,
        currentChannelMemberCount: PropTypes.number,
        membersNotInChannel: PropTypes.array.isRequired,
        currentTeam: PropTypes.object,
        currentTeamMemberCount: PropTypes.number,
        preferences: PropTypes.object,
        loadMoreRequestStatus: PropTypes.string,
        searchRequestStatus: PropTypes.string,
        addChannelMemberStatus: PropTypes.string,
        subscribeToHeaderEvent: React.PropTypes.func,
        unsubscribeFromHeaderEvent: React.PropTypes.func,
        actions: PropTypes.shape({
            getTeamStats: PropTypes.func.isRequired,
            getProfilesNotInChannel: PropTypes.func.isRequired,
            goBack: PropTypes.func.isRequired,
            handleAddChannelMembers: PropTypes.func.isRequired,
            searchProfiles: PropTypes.func.isRequired
        })
    };

    static navigationProps = {
        renderRightComponent: (props, emitter) => {
            return (
                <ActionButton
                    actionEventName='add_members'
                    emitter={emitter}
                    enabled={false}
                    enableEventName='can_add_members'
                    labelDefaultMessage='Add'
                    labelId='integrations.add'
                    loadingEventName='adding_members'
                />
            );
        }
    };

    state = {
        canSelect: true,
        profiles: [],
        selectedMembers: {}
    };

    componentWillMount() {
        this.props.subscribeToHeaderEvent('add_members', this.handleAddMembersPress);
    }

    componentDidMount() {
        if (Platform.OS === 'android') {
            Keyboard.addListener('keyboardDidHide', this.handleAndroidKeyboard);
        }

        InteractionManager.runAfterInteractions(() => {
            this.props.actions.getProfilesNotInChannel(this.props.currentTeam.id, this.props.currentChannel.id, 0);
            this.props.actions.getTeamStats(this.props.currentTeam.id);
        });

        this.emitCanAddMembers(false);
    }

    componentWillUnmount() {
        this.props.unsubscribeFromHeaderEvent('add_members');

        if (Platform.OS === 'android') {
            Keyboard.removeListener('keyboardDidHide', this.handleAndroidKeyboard);
        }
    }

    componentWillReceiveProps(nextProps) {
        const {loadMoreRequestStatus} = this.props;
        if (loadMoreRequestStatus === RequestStatus.STARTED &&
            nextProps.loadMoreRequestStatus === RequestStatus.SUCCESS) {
            this.setState({profiles: nextProps.membersNotInChannel});
        } else if (this.state.searching &&
            nextProps.searchRequestStatus === RequestStatus.SUCCESS) {
            const results = nextProps.membersNotInChannel.filter((p) => {
                const {term} = this.state;
                return p.username.toLowerCase().includes(term) || p.email.toLowerCase().includes(term) ||
                    p.first_name.toLowerCase().includes(term) || p.last_name.toLowerCase().includes(term);
            });
            this.setState({profiles: results});
        }

        const {addChannelMemberStatus} = nextProps;

        if (this.props.addChannelMemberStatus !== addChannelMemberStatus) {
            switch (addChannelMemberStatus) {
            case RequestStatus.STARTED:
                this.emitAdding(true);
                this.setState({error: null});
                break;
            case RequestStatus.SUCCESS:
                this.emitAdding(false);
                this.setState({error: null});
                this.props.actions.goBack();
                break;
            case RequestStatus.FAILURE:
                this.emitAdding(false);
                break;
            }
        }
    }

    handleAddMembersPress = () => {
        const {selectedMembers} = this.state;
        const {actions, currentTeam, currentChannel} = this.props;
        const membersToAdd = Object.keys(selectedMembers).filter((m) => selectedMembers[m]);

        if (!membersToAdd.length) {
            Alert.alert('Add Members', 'You must select at least one member to add to the channel.');
            return;
        }

        actions.handleAddChannelMembers(currentTeam.id, currentChannel.id, membersToAdd);
    };

    handleAndroidKeyboard = () => {
        this.onSearchButtonPress();
    };

    loadMoreMembers = () => {
        const {currentChannelMemberCount, currentTeamMemberCount, membersNotInChannel, loadMoreRequestStatus} = this.props;
        if (loadMoreRequestStatus !== RequestStatus.STARTED && membersNotInChannel.length < (currentTeamMemberCount - currentChannelMemberCount - 1)) {
            this.props.actions.getProfilesNotInChannel(this.props.currentTeam.id, this.props.currentChannel.id, this.props.membersNotInChannel.length);
        }
    };

    handleRowSelect = (id) => {
        const selectedMembers = Object.assign({}, this.state.selectedMembers, {[id]: !this.state.selectedMembers[id]});

        if (Object.values(selectedMembers).filter((selected) => selected).length) {
            this.emitCanAddMembers(true);
        } else {
            this.emitCanAddMembers(false);
        }
        this.setState({
            selectedMembers
        });
    };

    emitCanAddMembers = (enabled) => {
        EventEmitter.emit('can_add_members', enabled);
    };

    emitAdding = (loading) => {
        this.setState({canSelect: false});
        EventEmitter.emit('adding_members', loading);
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
                this.props.actions.searchProfiles(term, {not_in_channel_id: this.props.currentChannel.id});
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
            profiles: this.props.membersNotInChannel
        });
    };

    render() {
        const {intl, loadMoreRequestStatus, searchRequestStatus, preferences, theme} = this.props;
        const {profiles, searching} = this.state;
        const {formatMessage} = intl;
        const isLoading = (loadMoreRequestStatus === RequestStatus.STARTED) ||
            (searchRequestStatus === RequestStatus.STARTED);
        const style = getStyleFromTheme(theme);
        const more = searching ? () => true : this.loadMoreMembers;

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
                    selectable={this.state.canSelect}
                    onRowSelect={this.handleRowSelect}
                    renderRow={renderMemberRow}
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

export default injectIntl(ChannelAddMembers);
