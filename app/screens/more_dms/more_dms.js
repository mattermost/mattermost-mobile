// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {injectIntl, intlShape} from 'react-intl';
import {
    Alert,
    InteractionManager,
    StyleSheet,
    View
} from 'react-native';

import {General, RequestStatus} from 'mattermost-redux/constants';
import EventEmitter from 'mattermost-redux/utils/event_emitter';
import {displayUsername, filterProfilesMatchingTerm} from 'mattermost-redux/utils/user_utils';

import Loading from 'app/components/loading';
import MemberList from 'app/components/custom_list';
import SearchBar from 'app/components/search_bar';
import StatusBar from 'app/components/status_bar';
import {createMembersSections, loadingText, renderMemberRow} from 'app/utils/member_list';
import {makeStyleSheetFromTheme, changeOpacity} from 'app/utils/theme';

class MoreDirectMessages extends PureComponent {
    static propTypes = {
        currentDisplayName: PropTypes.string,
        intl: intlShape.isRequired,
        navigator: PropTypes.object,
        preferences: PropTypes.object.isRequired,
        theme: PropTypes.object.isRequired,
        profiles: PropTypes.array,
        createChannelRequest: PropTypes.object.isRequired,
        requestStatus: PropTypes.object.isRequired,
        searchRequest: PropTypes.object.isRequired,
        actions: PropTypes.shape({
            makeDirectChannel: PropTypes.func.isRequired,
            getProfiles: PropTypes.func.isRequired,
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
            adding: false,
            next: true,
            searching: false,
            showNoResults: false
        };
        this.props.navigator.setOnNavigatorEvent(this.onNavigatorEvent);
    }

    componentWillReceiveProps(nextProps) {
        const {requestStatus} = this.props;
        if (requestStatus.status === RequestStatus.STARTED &&
            nextProps.requestStatus.status === RequestStatus.SUCCESS) {
            const {page} = this.state;
            const profiles = nextProps.profiles.splice(0, (page + 1) * General.PROFILE_CHUNK_SIZE);
            this.setState({profiles, showNoResults: true, error: null});
        } else if (this.state.searching &&
            nextProps.searchRequest.status === RequestStatus.SUCCESS) {
            const results = filterProfilesMatchingTerm(nextProps.profiles, this.state.term);
            this.setState({profiles: results, showNoResults: true, error: null});
        } else if (nextProps.createChannelRequest.status === RequestStatus.FAILURE && this.state.displayName) {
            const {intl} = this.props;
            Alert.alert(
                '',
                intl.formatMessage({
                    id: 'mobile.open_dm.error',
                    defaultMessage: "We couldn't open a direct message with {displayName}. Please check your connection and try again."
                }, {displayName: this.state.displayName})
            );
            this.setState({adding: false, displayName: null});
        }
    }

    componentDidMount() {
        // set the timeout to 400 cause is the time that the modal takes to open
        // Somehow interactionManager doesn't care
        setTimeout(() => {
            this.props.actions.getProfiles(0);
        }, 400);
    }

    close = () => {
        this.props.navigator.dismissModal({
            animationType: 'slide-down'
        });
    };

    onNavigatorEvent = (event) => {
        if (event.type === 'NavBarButtonPress') {
            if (event.id === 'close-dms') {
                this.close();
            }
        }
    };

    searchProfiles = (text) => {
        const term = text.toLowerCase();

        if (term) {
            this.setState({searching: true, term});
            clearTimeout(this.searchTimeoutId);

            this.searchTimeoutId = setTimeout(() => {
                this.props.actions.searchProfiles(term);
            }, General.SEARCH_TIMEOUT_MILLISECONDS);
        } else {
            this.cancelSearch();
        }
    };

    cancelSearch = () => {
        this.setState({
            searching: false,
            term: null,
            error: null,
            page: 0,
            profiles: this.props.profiles
        });
    };

    loadMoreProfiles = () => {
        let {page} = this.state;
        if (this.props.requestStatus.status !== RequestStatus.STARTED && this.state.next && !this.state.searching) {
            page = page + 1;
            this.props.actions.getProfiles(page, General.PROFILE_CHUNK_SIZE).
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

    onSelectMember = async (id) => {
        const {actions, currentDisplayName, preferences, profiles} = this.props;
        const user = profiles.find((p) => p.id === id);

        this.setState({adding: true});

        // save the current channel display name in case it fails
        const currentChannelDisplayName = currentDisplayName;

        if (user) {
            actions.setChannelDisplayName(displayUsername(user, preferences));
        } else {
            actions.setChannelDisplayName('');
        }
        const result = await actions.makeDirectChannel(id);

        if (result) {
            EventEmitter.emit('close_channel_drawer');
            InteractionManager.runAfterInteractions(() => {
                this.close();
            });
        } else {
            this.setState({displayName: displayUsername(user, preferences)});
            actions.setChannelDisplayName(currentChannelDisplayName);
        }
    };

    render() {
        const {intl, preferences, requestStatus, searchRequest, theme} = this.props;
        const {adding, profiles, searching, showNoResults} = this.state;
        const {formatMessage} = intl;
        const isLoading = (requestStatus.status === RequestStatus.STARTED) || (requestStatus.status === RequestStatus.NOT_STARTED) ||
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
                            onChangeText={this.searchProfiles}
                            onSearchButtonPress={this.searchProfiles}
                            onCancelButtonPress={this.cancelSearch}
                        />
                    </View>
                    <MemberList
                        data={profiles}
                        theme={theme}
                        searching={searching}
                        onListEndReached={more}
                        preferences={preferences}
                        loading={isLoading}
                        selectable={false}
                        listScrollRenderAheadDistance={50}
                        createSections={createMembersSections}
                        renderRow={renderMemberRow}
                        onRowPress={this.onSelectMember}
                        loadingText={loadingText}
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
