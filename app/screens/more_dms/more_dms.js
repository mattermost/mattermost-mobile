// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {injectIntl, intlShape} from 'react-intl';
import {
    InteractionManager,
    StyleSheet,
    View
} from 'react-native';

import {General, RequestStatus} from 'mattermost-redux/constants';
import EventEmitter from 'mattermost-redux/utils/event_emitter';
import {displayUsername, filterProfilesMatchingTerm} from 'mattermost-redux/utils/user_utils';

import CustomList from 'app/components/custom_list';
import UserListRow from 'app/components/custom_list/user_list_row';
import Loading from 'app/components/loading';
import SearchBar from 'app/components/search_bar';
import StatusBar from 'app/components/status_bar';
import {alertErrorWithFallback} from 'app/utils/general';
import {createMembersSections, loadingText, markSelectedProfiles} from 'app/utils/member_list';
import {makeStyleSheetFromTheme, changeOpacity} from 'app/utils/theme';

const START_BUTTON = 'start-conversation';
const CLOSE_BUTTON = 'close-dms';

class MoreDirectMessages extends PureComponent {
    static propTypes = {
        currentDisplayName: PropTypes.string,
        intl: intlShape.isRequired,
        navigator: PropTypes.object,
        config: PropTypes.object.isRequired,
        currentTeamId: PropTypes.string.isRequired,
        teammateNameDisplay: PropTypes.string,
        theme: PropTypes.object.isRequired,
        profiles: PropTypes.array,
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
            profiles: props.profiles.splice(0, General.PROFILE_CHUNK_SIZE),
            page: 0,
            next: true,
            searching: false,
            showNoResults: false,
            term: '',
            canStartConversation: false,
            loadingChannel: false,
            canSelect: true,
            selectedIds: {}
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
        const {getRequest} = this.props;
        if (getRequest.status === RequestStatus.STARTED &&
            nextProps.getRequest.status === RequestStatus.SUCCESS) {
            const {page} = this.state;
            const profiles = nextProps.profiles.splice(0, (page + 1) * General.PROFILE_CHUNK_SIZE);
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
        if (state.going) {
            return false;
        }

        const selectedCount = Object.keys(state.selectedIds).length;
        return selectedCount >= General.MIN_USERS_IN_GM - 1 && selectedCount <= General.MAX_USERS_IN_GM - 1;
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
        let {page} = this.state;
        if (this.props.getRequest.status !== RequestStatus.STARTED && this.state.next && !this.state.searching) {
            page = page + 1;
            this.getProfiles(page).then((data) => {
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

    handleRowSelect = (id) => {
        this.setState((prevState) => {
            if (Object.keys(prevState.selectedIds).length === General.MAX_USERS_IN_GM - 1) {
                return prevState;
            }
            const selectedIds = {...this.state.selectedIds};

            if (selectedIds[id]) {
                Reflect.deleteProperty(selectedIds, id);
            } else {
                selectedIds[id] = true;
            }

            return {
                profiles: markSelectedProfiles(prevState.profiles, selectedIds),
                selectedIds
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

        this.setState({
            loadingChannel: false
        });

        if (success) {
            EventEmitter.emit('close_channel_drawer');
            InteractionManager.runAfterInteractions(() => {
                this.close();
            });
        } else {
            this.props.actions.setChannelDisplayName(currentChannelDisplayName);
        }
    }

    makeGroupChannel = async (ids) => {
        const result = await this.props.actions.makeGroupChannel(ids);

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
    }

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

    render() {
        const {
            intl,
            getRequest,
            searchRequest,
            theme
        } = this.props;
        const {
            adding,
            profiles,
            searching,
            showNoResults,
            term
        } = this.state;

        const {formatMessage} = intl;
        const isLoading = (
            getRequest.status === RequestStatus.STARTED) || (getRequest.status === RequestStatus.NOT_STARTED) ||
            (searchRequest.status === RequestStatus.STARTED);
        const style = getStyleFromTheme(theme);
        const more = this.state.searching ? () => true : this.loadMoreProfiles;

        let content;
        if (adding) {
            content = (
                <View style={style.container}>
                    <StatusBar/>
                    <Loading/>
                </View>
            );
        } else {
            content = (
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
                            inputStyle={{
                                backgroundColor: changeOpacity(theme.centerChannelColor, 0.2),
                                color: theme.centerChannelColor,
                                fontSize: 13
                            }}
                            placeholderTextColor={changeOpacity(theme.centerChannelColor, 0.5)}
                            tintColorSearch={changeOpacity(theme.centerChannelColor, 0.8)}
                            tintColorDelete={changeOpacity(theme.centerChannelColor, 0.5)}
                            titleCancelColor={theme.centerChannelColor}
                            onChangeText={this.onSearch}
                            onSearchButtonPress={this.onSearch}
                            onCancelButtonPress={this.cancelSearch}
                            value={term}
                        />
                    </View>
                    <CustomList
                        data={profiles}
                        theme={theme}
                        searching={searching}
                        onListEndReached={more}
                        listScrollRenderAheadDistance={50}
                        loading={isLoading}
                        loadingText={loadingText}
                        selectable={this.state.canSelect}
                        onRowSelect={this.handleRowSelect}
                        rowComponent={UserListRow}
                        createSections={createMembersSections}
                        showNoResults={showNoResults}
                    />
                </View>
            );
        }

        return content;
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

export default injectIntl(MoreDirectMessages);
