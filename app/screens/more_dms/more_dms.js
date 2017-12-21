// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {injectIntl, intlShape} from 'react-intl';
import {
    InteractionManager,
    View
} from 'react-native';

import {General, RequestStatus} from 'mattermost-redux/constants';
import EventEmitter from 'mattermost-redux/utils/event_emitter';
import {getGroupDisplayNameFromUserIds} from 'mattermost-redux/utils/channel_utils';
import {displayUsername, filterProfilesMatchingTerm} from 'mattermost-redux/utils/user_utils';

import CustomSectionList from 'app/components/custom_section_list';
import UserListRow from 'app/components/custom_list/user_list_row';
import Loading from 'app/components/loading';
import SearchBar from 'app/components/search_bar';
import StatusBar from 'app/components/status_bar';
import {alertErrorWithFallback} from 'app/utils/general';
import {loadingText} from 'app/utils/member_list';
import {changeOpacity, makeStyleSheetFromTheme, setNavigatorStyles} from 'app/utils/theme';

import SelectedUsers from './selected_users';

const START_BUTTON = 'start-conversation';
const CLOSE_BUTTON = 'close-dms';

class MoreDirectMessages extends PureComponent {
    static propTypes = {
        currentDisplayName: PropTypes.string,
        intl: intlShape.isRequired,
        navigator: PropTypes.object,
        config: PropTypes.object.isRequired,
        currentUserId: PropTypes.string.isRequired,
        currentTeamId: PropTypes.string.isRequired,
        teammateNameDisplay: PropTypes.string,
        theme: PropTypes.object.isRequired,
        allProfiles: PropTypes.object.isRequired,
        profiles: PropTypes.array.isRequired,
        getRequest: PropTypes.object.isRequired,
        searchRequest: PropTypes.object.isRequired,
        actions: PropTypes.shape({
            makeDirectChannel: PropTypes.func.isRequired,
            makeGroupChannel: PropTypes.func.isRequired,
            getProfiles: PropTypes.func.isRequired,
            getProfilesInTeam: PropTypes.func.isRequired,
            searchProfiles: PropTypes.func.isRequired,
            setChannelDisplayName: PropTypes.func.isRequired
        }).isRequired
    };

    constructor(props) {
        super(props);

        this.searchTimeoutId = 0;

        this.state = {
            profiles: props.profiles.slice(0, General.PROFILE_CHUNK_SIZE),
            page: 0,
            next: true,
            searching: false,
            showNoResults: false,
            term: '',
            canStartConversation: false,
            loadingChannel: false,
            canSelect: true,
            selectedIds: {},
            selectedCount: 0
        };

        props.navigator.setOnNavigatorEvent(this.onNavigatorEvent);
        this.updateNavigationButtons(false);
    }

    componentDidMount() {
        // set the timeout to 400 cause is the time that the modal takes to open
        // Somehow interactionManager doesn't care
        setTimeout(() => {
            this.getProfiles(0);
        }, 400);
    }

    componentWillReceiveProps(nextProps) {
        if (this.props.theme !== nextProps.theme) {
            setNavigatorStyles(this.props.navigator, nextProps.theme);
        }

        const {getRequest} = this.props;
        if (getRequest.status === RequestStatus.STARTED &&
            nextProps.getRequest.status === RequestStatus.SUCCESS) {
            const {page} = this.state;
            const profiles = nextProps.profiles.slice(0, (page + 1) * General.PROFILE_CHUNK_SIZE);
            this.setState({profiles, showNoResults: true});
        } else if (this.state.searching &&
            nextProps.searchRequest.status === RequestStatus.SUCCESS) {
            const results = filterProfilesMatchingTerm(nextProps.profiles, this.state.term);
            this.setState({profiles: results, showNoResults: true});
        }
    }

    componentDidUpdate(prevProps, prevState) {
        const startEnabled = this.isStartEnabled(this.state);
        const wasStartEnabled = this.isStartEnabled(prevState);

        if (startEnabled && !wasStartEnabled) {
            this.updateNavigationButtons(true);
        } else if (!startEnabled && !wasStartEnabled) {
            this.updateNavigationButtons(false);
        }
    }

    isStartEnabled = (state) => {
        if (state.loadingChannel) {
            return false;
        }

        return state.selectedCount >= 1 && state.selectedCount <= General.MAX_USERS_IN_GM - 1;
    };

    updateNavigationButtons = (startEnabled) => {
        this.props.navigator.setButtons({
            rightButtons: [{
                id: START_BUTTON,
                title: this.props.intl.formatMessage({id: 'mobile.more_dms.start', defaultMessage: 'Start'}),
                showAsAction: 'always',
                disabled: !startEnabled
            }]
        });
    };

    close = () => {
        this.props.navigator.dismissModal({
            animationType: 'slide-down'
        });
    };

    onNavigatorEvent = (event) => {
        if (event.type === 'NavBarButtonPress') {
            if (event.id === START_BUTTON) {
                this.startConversation();
            } else if (event.id === CLOSE_BUTTON) {
                this.close();
            }
        }
    };

    onSearch = (text) => {
        const term = text.toLowerCase();

        if (term) {
            this.setState({searching: true, term});
            clearTimeout(this.searchTimeoutId);

            this.searchTimeoutId = setTimeout(() => {
                this.searchProfiles(term);
            }, General.SEARCH_TIMEOUT_MILLISECONDS);
        } else {
            this.cancelSearch();
        }
    };

    cancelSearch = () => {
        this.setState({
            searching: false,
            term: '',
            page: 0,
            profiles: this.props.profiles
        });
    };

    getProfiles = (page) => {
        if (this.props.config.RestrictDirectMessage === General.RESTRICT_DIRECT_MESSAGE_ANY) {
            return this.props.actions.getProfiles(page, General.PROFILE_CHUNK_SIZE);
        }

        return this.props.actions.getProfilesInTeam(page, General.PROFILE_CHUNK_SIZE);
    };

    searchProfiles = (term) => {
        if (this.props.config.RestrictDirectMessage === General.RESTRICT_DIRECT_MESSAGE_ANY) {
            return this.props.actions.searchProfiles(term);
        }

        return this.props.actions.searchProfiles(term, {team_id: this.props.currentTeamId});
    };

    loadMoreProfiles = () => {
        if (this.state.searching) {
            return;
        }

        let {page} = this.state;
        if (this.props.getRequest.status !== RequestStatus.STARTED && this.state.next && !this.state.searching) {
            page = page + 1;
            this.getProfiles(page).then(({data}) => {
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

    handleSelectUser = (id) => {
        this.setState((prevState) => {
            const wasSelected = prevState.selectedIds[id];

            // Prevent selecting too many users
            if (!wasSelected && Object.keys(prevState.selectedIds).length >= General.MAX_USERS_IN_GM - 1) {
                return {};
            }

            const selectedIds = {...prevState.selectedIds};

            if (wasSelected) {
                Reflect.deleteProperty(selectedIds, id);
            } else {
                selectedIds[id] = true;
            }

            return {
                selectedIds,
                selectedCount: Object.keys(selectedIds).length
            };
        });
    };

    handleRemoveUser = (id) => {
        this.setState((prevState) => {
            const selectedIds = {...prevState.selectedIds};
            Reflect.deleteProperty(selectedIds, id);

            return {
                selectedIds,
                selectedCount: Object.keys(selectedIds).length
            };
        });
    }

    startConversation = async () => {
        if (this.state.loadingChannel) {
            return;
        }

        this.setState({
            loadingChannel: true
        });

        // Save the current channel display name in case it fails
        const currentChannelDisplayName = this.props.currentDisplayName;

        const selectedIds = Object.keys(this.state.selectedIds);
        let success;
        if (selectedIds.length === 0) {
            success = false;
        } else if (selectedIds.length > 1) {
            success = await this.makeGroupChannel(selectedIds);
        } else {
            success = await this.makeDirectChannel(selectedIds[0]);
        }

        if (success) {
            EventEmitter.emit('close_channel_drawer');
            InteractionManager.runAfterInteractions(() => {
                this.close();
            });
        } else {
            this.setState({
                loadingChannel: false
            });

            this.props.actions.setChannelDisplayName(currentChannelDisplayName);
        }
    };

    makeGroupChannel = async (ids) => {
        const result = await this.props.actions.makeGroupChannel(ids);

        const displayName = getGroupDisplayNameFromUserIds(ids, this.props.allProfiles, this.props.currentUserId, this.props.teammateNameDisplay);
        this.props.actions.setChannelDisplayName(displayName);

        if (result.error) {
            alertErrorWithFallback(
                this.props.intl,
                result.error,
                {
                    id: 'mobile.open_gm.error',
                    defaultMessage: "We couldn't open a group message with those users. Please check your connection and try again."
                }
            );
        }

        return !result.error;
    };

    makeDirectChannel = async (id) => {
        const user = this.state.profiles[id];

        const displayName = displayUsername(user, this.props.teammateNameDisplay);
        this.props.actions.setChannelDisplayName(displayName);

        const result = await this.props.actions.makeDirectChannel(id);

        if (result.error) {
            alertErrorWithFallback(
                this.props.intl,
                result.error,
                {
                    id: 'mobile.open_dm.error',
                    defaultMessage: "We couldn't open a direct message with {displayName}. Please check your connection and try again."
                },
                {
                    displayName
                }
            );
        }

        return !result.error;
    };

    sectionKeyExtractor = (user) => {
        // Group items alphabetically by first letter
        return displayUsername(user, this.props.teammateNameDisplay)[0].toUpperCase();
    }

    compareItems = (a, b) => {
        const aName = displayUsername(a, this.props.teammateNameDisplay);
        const bName = displayUsername(b, this.props.teammateNameDisplay);

        return aName.localeCompare(bName);
    };

    renderItem = (props) => {
        // The list will re-render when the selection changes because it's passed into the list as extraData
        const selected = this.state.selectedIds[props.id];
        const enabled = selected || this.state.selectedCount < General.MAX_USERS_IN_GM - 1;

        return (
            <UserListRow
                key={props.id}
                {...props}
                selectable={true}
                selected={selected}
                enabled={enabled}
            />
        );
    };

    render() {
        const {
            getRequest,
            searchRequest,
            theme
        } = this.props;
        const {
            loadingChannel,
            showNoResults,
            term
        } = this.state;

        const isLoading = (
            getRequest.status === RequestStatus.STARTED) || (getRequest.status === RequestStatus.NOT_STARTED) ||
            (searchRequest.status === RequestStatus.STARTED);
        const style = getStyleFromTheme(theme);

        if (loadingChannel) {
            return (
                <View style={style.container}>
                    <StatusBar/>
                    <Loading/>
                </View>
            );
        }

        return (
            <View style={style.container}>
                <StatusBar/>
                <View style={style.searchContainer}>
                    <SearchBar
                        ref='search_bar'
                        placeholder={this.props.intl.formatMessage({id: 'search_bar.search', defaultMessage: 'Search'})}
                        cancelTitle={this.props.intl.formatMessage({id: 'mobile.post.cancel', defaultMessage: 'Cancel'})}
                        backgroundColor='transparent'
                        inputHeight={33}
                        inputStyle={{
                            backgroundColor: changeOpacity(theme.centerChannelColor, 0.2),
                            color: theme.centerChannelColor,
                            fontSize: 15,
                            lineHeight: 66
                        }}
                        placeholderTextColor={changeOpacity(theme.centerChannelColor, 0.5)}
                        tintColorSearch={changeOpacity(theme.centerChannelColor, 0.5)}
                        tintColorDelete={changeOpacity(theme.centerChannelColor, 0.5)}
                        titleCancelColor={theme.centerChannelColor}
                        onChangeText={this.onSearch}
                        onSearchButtonPress={this.onSearch}
                        onCancelButtonPress={this.cancelSearch}
                        value={term}
                    />
                    <SelectedUsers
                        selectedIds={this.state.selectedIds}
                        warnCount={5}
                        warnMessage={{id: 'mobile.more_dms.add_more', defaultMessage: 'You can add {remaining, number} more users'}}
                        maxCount={7}
                        maxMessage={{id: 'mobile.more_dms.cannot_add_more', defaultMessage: 'You cannot add more users'}}
                        onRemove={this.handleRemoveUser}
                    />
                </View>
                <CustomSectionList
                    theme={theme}
                    items={this.state.profiles}
                    renderItem={this.renderItem}
                    showNoResults={showNoResults}
                    sectionKeyExtractor={this.sectionKeyExtractor}
                    compareItems={this.compareItems}
                    extraData={this.state.selectedIds}
                    onListEndReached={this.loadMoreProfiles}
                    listScrollRenderAheadDistance={50}
                    onRowPress={this.handleSelectUser}
                    loading={isLoading}
                    loadingText={loadingText}
                />
            </View>
        );
    }
}

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            flex: 1,
            backgroundColor: theme.centerChannelBg
        },
        searchContainer: {
            marginVertical: 5
        }
    };
});

export default injectIntl(MoreDirectMessages);
