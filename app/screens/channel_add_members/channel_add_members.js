// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {injectIntl, intlShape} from 'react-intl';
import {
    Alert,
    InteractionManager,
    Platform,
    View,
} from 'react-native';

import Loading from 'app/components/loading';
import CustomList from 'app/components/custom_list';
import UserListRow from 'app/components/custom_list/user_list_row';
import SearchBar from 'app/components/search_bar';
import StatusBar from 'app/components/status_bar';
import {alertErrorIfInvalidPermissions} from 'app/utils/general';
import {createMembersSections, loadingText, markSelectedProfiles} from 'app/utils/member_list';
import {changeOpacity, makeStyleSheetFromTheme, setNavigatorStyles} from 'app/utils/theme';

import {General, RequestStatus} from 'mattermost-redux/constants';
import {filterProfilesMatchingTerm} from 'mattermost-redux/utils/user_utils';

class ChannelAddMembers extends PureComponent {
    static propTypes = {
        intl: intlShape.isRequired,
        theme: PropTypes.object.isRequired,
        currentChannel: PropTypes.object,
        membersNotInChannel: PropTypes.array.isRequired,
        currentTeam: PropTypes.object,
        navigator: PropTypes.object,
        preferences: PropTypes.object,
        loadMoreRequestStatus: PropTypes.string,
        searchRequestStatus: PropTypes.string,
        addChannelMemberStatus: PropTypes.string,
        actions: PropTypes.shape({
            getTeamStats: PropTypes.func.isRequired,
            getProfilesNotInChannel: PropTypes.func.isRequired,
            handleAddChannelMembers: PropTypes.func.isRequired,
            searchProfiles: PropTypes.func.isRequired,
        }),
    };

    addButton = {
        disabled: true,
        id: 'add-members',
        showAsAction: 'always',
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
            showNoResults: false,
            term: '',
        };
        this.addButton.title = props.intl.formatMessage({id: 'integrations.add', defaultMessage: 'Add'});

        props.navigator.setOnNavigatorEvent(this.onNavigatorEvent);
        props.navigator.setButtons({
            rightButtons: [this.addButton],
        });
    }

    componentDidMount() {
        InteractionManager.runAfterInteractions(() => {
            this.props.actions.getProfilesNotInChannel(this.props.currentTeam.id, this.props.currentChannel.id, 0);
            this.props.actions.getTeamStats(this.props.currentTeam.id);
        });

        this.emitCanAddMembers(false);
    }

    componentWillReceiveProps(nextProps) {
        if (this.props.theme !== nextProps.theme) {
            setNavigatorStyles(this.props.navigator, nextProps.theme);
        }

        const {loadMoreRequestStatus} = this.props;
        if (loadMoreRequestStatus === RequestStatus.STARTED &&
            nextProps.loadMoreRequestStatus === RequestStatus.SUCCESS) {
            const {page} = this.state;
            const profiles = markSelectedProfiles(
                nextProps.membersNotInChannel.slice(0, (page + 1) * General.PROFILE_CHUNK_SIZE),
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
            term: '',
            page: 0,
            profiles: markSelectedProfiles(this.props.membersNotInChannel, this.state.selectedMembers),
        });
    };

    close = () => {
        this.props.navigator.pop({animated: true});
    };

    emitAdding = (loading) => {
        this.props.navigator.setButtons({
            rightButtons: [{...this.addButton, disabled: loading}],
        });
    };

    emitCanAddMembers = (enabled) => {
        this.props.navigator.setButtons({
            rightButtons: [{...this.addButton, disabled: !enabled}],
        });
    };

    handleAddMembersPress = async () => {
        const {selectedMembers} = this.state;
        const {actions, currentChannel} = this.props;
        const membersToAdd = Object.keys(selectedMembers).filter((m) => selectedMembers[m]);

        if (!membersToAdd.length) {
            Alert.alert('Add Members', 'You must select at least one member to add to the channel.');
            return;
        }

        alertErrorIfInvalidPermissions(
            await actions.handleAddChannelMembers(currentChannel.id, membersToAdd)
        );
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
            selectedMembers,
        });
    };

    loadMoreMembers = () => {
        const {actions, loadMoreRequestStatus, currentChannel, currentTeam} = this.props;
        const {next, searching} = this.state;
        let {page} = this.state;
        if (loadMoreRequestStatus !== RequestStatus.STARTED && next && !searching) {
            page = page + 1;
            actions.getProfilesNotInChannel(currentTeam.id, currentChannel.id, page, General.PROFILE_CHUNK_SIZE).then(({data}) => {
                if (data && data.length) {
                    this.setState({
                        page,
                    });
                } else {
                    this.setState({next: false});
                }
            });
        }
    };

    onNavigatorEvent = (event) => {
        if (event.type === 'NavBarButtonPress') {
            if (event.id === this.addButton.id) {
                this.handleAddMembersPress();
            }
        }
    };

    searchProfiles = (text) => {
        const term = text;
        const {actions, currentChannel, currentTeam} = this.props;

        if (term) {
            this.setState({searching: true, term});
            clearTimeout(this.searchTimeoutId);

            this.searchTimeoutId = setTimeout(() => {
                actions.searchProfiles(term.toLowerCase(), {not_in_channel_id: currentChannel.id, team_id: currentTeam.id});
            }, General.SEARCH_TIMEOUT_MILLISECONDS);
        } else {
            this.cancelSearch();
        }
    };

    render() {
        const {intl, loadMoreRequestStatus, searchRequestStatus, preferences, theme} = this.props;
        const {adding, profiles, searching, term} = this.state;
        const {formatMessage} = intl;
        const isLoading = (loadMoreRequestStatus === RequestStatus.STARTED) ||
            (searchRequestStatus === RequestStatus.STARTED);
        const style = getStyleFromTheme(theme);
        const more = searching ? () => true : this.loadMoreMembers;

        if (adding) {
            return (
                <View style={style.container}>
                    <StatusBar/>
                    <Loading/>
                </View>
            );
        }

        const searchBarInput = {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.2),
            color: theme.centerChannelColor,
            fontSize: 15,
            ...Platform.select({
                android: {
                    marginBottom: -5,
                },
            }),
        };

        return (
            <View style={style.container}>
                <StatusBar/>
                <View
                    style={{marginVertical: 5}}
                >
                    <SearchBar
                        ref='search_bar'
                        placeholder={formatMessage({id: 'search_bar.search', defaultMessage: 'Search'})}
                        cancelTitle={formatMessage({id: 'mobile.post.cancel', defaultMessage: 'Cancel'})}
                        backgroundColor='transparent'
                        inputHeight={33}
                        inputStyle={searchBarInput}
                        placeholderTextColor={changeOpacity(theme.centerChannelColor, 0.5)}
                        tintColorSearch={changeOpacity(theme.centerChannelColor, 0.5)}
                        tintColorDelete={changeOpacity(theme.centerChannelColor, 0.5)}
                        titleCancelColor={theme.centerChannelColor}
                        onChangeText={this.searchProfiles}
                        onSearchButtonPress={this.searchProfiles}
                        onCancelButtonPress={this.cancelSearch}
                        autoCapitalize='none'
                        value={term}
                    />
                </View>
                <CustomList
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
                    renderRow={UserListRow}
                    createSections={createMembersSections}
                />
            </View>
        );
    }
}

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            flex: 1,
            backgroundColor: theme.centerChannelBg,
        },
    };
});

export default injectIntl(ChannelAddMembers);
