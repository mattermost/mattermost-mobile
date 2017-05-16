// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {injectIntl, intlShape} from 'react-intl';
import {
    Alert,
    Keyboard,
    Platform,
    InteractionManager,
    StatusBar,
    StyleSheet,
    View
} from 'react-native';

import Loading from 'app/components/loading';
import MemberList from 'app/components/custom_list';
import SearchBar from 'app/components/search_bar';
import {createMembersSections, loadingText, markSelectedProfiles, renderMemberRow} from 'app/utils/member_list';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

import {General, RequestStatus} from 'mattermost-redux/constants';
import {filterProfilesMatchingTerm} from 'mattermost-redux/utils/user_utils';

class ChannelAddMembers extends PureComponent {
    static propTypes = {
        intl: intlShape.isRequired,
        theme: PropTypes.object.isRequired,
        currentChannel: PropTypes.object,
        currentChannelMemberCount: PropTypes.number,
        membersNotInChannel: PropTypes.array.isRequired,
        currentTeam: PropTypes.object,
        currentTeamMemberCount: PropTypes.number,
        navigator: PropTypes.object,
        preferences: PropTypes.object,
        loadMoreRequestStatus: PropTypes.string,
        searchRequestStatus: PropTypes.string,
        addChannelMemberStatus: PropTypes.string,
        actions: PropTypes.shape({
            getTeamStats: PropTypes.func.isRequired,
            getProfilesNotInChannel: PropTypes.func.isRequired,
            handleAddChannelMembers: PropTypes.func.isRequired,
            searchProfiles: PropTypes.func.isRequired
        })
    };

    addButton = {
        disabled: true,
        id: 'add-members',
        showAsAction: 'never'
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
        this.addButton.title = props.intl.formatMessage({id: 'integrations.add', defaultMessage: 'Add'});

        props.navigator.setOnNavigatorEvent(this.onNavigatorEvent);
        props.navigator.setButtons({
            rightButtons: [this.addButton]
        });
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
        if (Platform.OS === 'android') {
            Keyboard.removeListener('keyboardDidHide', this.handleAndroidKeyboard);
        }
    }

    componentWillReceiveProps(nextProps) {
        const {loadMoreRequestStatus} = this.props;
        if (loadMoreRequestStatus === RequestStatus.STARTED &&
            nextProps.loadMoreRequestStatus === RequestStatus.SUCCESS) {
            const {page} = this.state;
            const profiles = markSelectedProfiles(
                nextProps.membersNotInChannel.splice(0, (page + 1) * General.PROFILE_CHUNK_SIZE),
                this.state.selectedMembers
            );
            this.setState({profiles, showNoResults: true});
        } else if (this.state.searching &&
            nextProps.searchRequestStatus === RequestStatus.SUCCESS) {
            const results = markSelectedProfiles(
                filterProfilesMatchingTerm(nextProps.membersNotInChannel, this.state.term),
                this.state.selectedMembers
            );
            this.setState({profiles: results, showNoResults: true});
        }

        const {addChannelMemberStatus} = nextProps;

        if (this.props.addChannelMemberStatus !== addChannelMemberStatus) {
            switch (addChannelMemberStatus) {
            case RequestStatus.STARTED:
                this.emitAdding(true);
                this.setState({error: null, adding: true, canSelect: false});
                break;
            case RequestStatus.SUCCESS:
                this.emitAdding(false);
                this.setState({error: null, adding: false, canSelect: false});
                this.close();
                break;
            case RequestStatus.FAILURE:
                this.emitAdding(false);
                this.setState({adding: false, canSelect: true});
                break;
            }
        }
    }

    cancelSearch = () => {
        this.setState({
            searching: false,
            term: null,
            page: 0,
            profiles: markSelectedProfiles(this.props.membersNotInChannel, this.state.selectedMembers)
        });
    };

    close = () => {
        this.props.navigator.pop({animated: true});
    };

    emitAdding = (loading) => {
        this.props.navigator.setButtons({
            rightButtons: [{...this.addButton, disabled: loading}]
        });
    };

    emitCanAddMembers = (enabled) => {
        this.props.navigator.setButtons({
            rightButtons: [{...this.addButton, disabled: !enabled}]
        });
    };

    handleAddMembersPress = () => {
        const {selectedMembers} = this.state;
        const {actions, currentChannel} = this.props;
        const membersToAdd = Object.keys(selectedMembers).filter((m) => selectedMembers[m]);

        if (!membersToAdd.length) {
            Alert.alert('Add Members', 'You must select at least one member to add to the channel.');
            return;
        }

        actions.handleAddChannelMembers(currentChannel.id, membersToAdd);
    };

    handleAndroidKeyboard = () => {
        this.onSearchButtonPress();
    };

    handleRowSelect = (id) => {
        const selectedMembers = Object.assign({}, this.state.selectedMembers, {[id]: !this.state.selectedMembers[id]});

        if (Object.values(selectedMembers).filter((selected) => selected).length) {
            this.emitCanAddMembers(true);
        } else {
            this.emitCanAddMembers(false);
        }
        this.setState({
            profiles: markSelectedProfiles(this.state.profiles, selectedMembers),
            selectedMembers
        });
    };

    loadMoreMembers = () => {
        const {actions, loadMoreRequestStatus, currentChannel, currentTeam} = this.props;
        const {next, searching} = this.state;
        let {page} = this.state;
        if (loadMoreRequestStatus !== RequestStatus.STARTED && next && !searching) {
            page = page + 1;
            actions.getProfilesNotInChannel(currentTeam.id, currentChannel.id, page, General.PROFILE_CHUNK_SIZE).
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

    onNavigatorEvent = (event) => {
        if (event.type === 'NavBarButtonPress') {
            if (event.id === 'add-members') {
                this.handleAddMembersPress();
            }
        }
    };

    onSearchButtonPress = () => {
        this.searchBar.blur();
    };

    searchBarRef = (ref) => {
        this.searchBar = ref;
    };

    searchProfiles = (event) => {
        const term = event.nativeEvent.text.toLowerCase();
        const {actions, currentChannel, currentTeam} = this.props;

        if (term) {
            this.setState({searching: true, term});
            clearTimeout(this.searchTimeoutId);

            this.searchTimeoutId = setTimeout(() => {
                actions.searchProfiles(term, {not_in_channel_id: currentChannel.id, team_id: currentTeam.id});
            }, General.SEARCH_TIMEOUT_MILLISECONDS);
        } else {
            this.cancelSearch();
        }
    };

    render() {
        const {intl, loadMoreRequestStatus, searchRequestStatus, preferences, theme} = this.props;
        const {adding, profiles, searching} = this.state;
        const {formatMessage} = intl;
        const isLoading = (loadMoreRequestStatus === RequestStatus.STARTED) ||
            (searchRequestStatus === RequestStatus.STARTED);
        const style = getStyleFromTheme(theme);
        const more = searching ? () => true : this.loadMoreMembers;

        if (adding) {
            return (
                <View style={style.container}>
                    <StatusBar barStyle='light-content'/>
                    <Loading/>
                </View>
            );
        }

        return (
            <View style={style.container}>
                <StatusBar barStyle='light-content'/>
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
