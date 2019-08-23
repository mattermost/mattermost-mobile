// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {intlShape} from 'react-intl';
import {Platform, View} from 'react-native';
import {Navigation} from 'react-native-navigation';

import {debounce} from 'mattermost-redux/actions/helpers';
import {General} from 'mattermost-redux/constants';
import EventEmitter from 'mattermost-redux/utils/event_emitter';
import {getGroupDisplayNameFromUserIds} from 'mattermost-redux/utils/channel_utils';
import {displayUsername, filterProfilesMatchingTerm} from 'mattermost-redux/utils/user_utils';
import {paddingHorizontal as padding} from 'app/components/safe_area_view/iphone_x_spacing';

import CustomList, {FLATLIST, SECTIONLIST} from 'app/components/custom_list';
import UserListRow from 'app/components/custom_list/user_list_row';
import FormattedText from 'app/components/formatted_text';
import KeyboardLayout from 'app/components/layout/keyboard_layout';
import Loading from 'app/components/loading';
import SearchBar from 'app/components/search_bar';
import StatusBar from 'app/components/status_bar';
import {alertErrorWithFallback} from 'app/utils/general';
import {createProfilesSections, loadingText} from 'app/utils/member_list';
import {
    changeOpacity,
    makeStyleSheetFromTheme,
    setNavigatorStyles,
    getKeyboardAppearanceFromTheme,
} from 'app/utils/theme';
import {t} from 'app/utils/i18n';

import SelectedUsers from './selected_users';

const START_BUTTON = 'start-conversation';
const CLOSE_BUTTON = 'close-dms';

export default class MoreDirectMessages extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            makeDirectChannel: PropTypes.func.isRequired,
            makeGroupChannel: PropTypes.func.isRequired,
            getProfiles: PropTypes.func.isRequired,
            getProfilesInTeam: PropTypes.func.isRequired,
            searchProfiles: PropTypes.func.isRequired,
            setChannelDisplayName: PropTypes.func.isRequired,
            dismissModal: PropTypes.func.isRequired,
            setButtons: PropTypes.func.isRequired,
        }).isRequired,
        componentId: PropTypes.string,
        allProfiles: PropTypes.object.isRequired,
        currentDisplayName: PropTypes.string,
        currentTeamId: PropTypes.string.isRequired,
        currentUserId: PropTypes.string.isRequired,
        restrictDirectMessage: PropTypes.bool.isRequired,
        teammateNameDisplay: PropTypes.string,
        theme: PropTypes.object.isRequired,
        isLandscape: PropTypes.bool.isRequired,
    };

    static contextTypes = {
        intl: intlShape.isRequired,
    };

    constructor(props, context) {
        super(props, context);

        this.searchTimeoutId = 0;
        this.next = true;
        this.page = -1;
        this.mounted = false;

        this.state = {
            profiles: [],
            searchResults: [],
            loading: false,
            term: '',
            startingConversation: false,
            selectedIds: {},
            selectedCount: 0,
        };
    }

    componentDidMount() {
        this.navigationEventListener = Navigation.events().bindComponent(this);
        this.mounted = true;
        this.updateNavigationButtons(false);

        this.getProfiles();
    }

    componentWillUnmount() {
        this.mounted = false;
    }

    componentDidUpdate(prevProps) {
        const {componentId, theme} = this.props;
        const {selectedCount, startingConversation} = this.state;
        const canStart = selectedCount > 0 && !startingConversation;

        this.updateNavigationButtons(canStart);

        if (theme !== prevProps.theme) {
            setNavigatorStyles(componentId, theme);
        }
    }

    navigationButtonPressed({buttonId}) {
        if (buttonId === START_BUTTON) {
            this.startConversation();
        } else if (buttonId === CLOSE_BUTTON) {
            this.close();
        }
    }

    close = () => {
        this.props.actions.dismissModal();
    };

    clearSearch = () => {
        this.setState({term: '', searchResults: []});
    };

    getProfiles = debounce(() => {
        const {loading, term} = this.state;
        if (this.next && !loading && !term && this.mounted) {
            this.setState({loading: true}, () => {
                const {actions, currentTeamId, restrictDirectMessage} = this.props;

                if (restrictDirectMessage) {
                    actions.getProfiles(this.page + 1, General.PROFILE_CHUNK_SIZE).then(this.loadedProfiles);
                } else {
                    actions.getProfilesInTeam(currentTeamId, this.page + 1, General.PROFILE_CHUNK_SIZE).then(this.loadedProfiles);
                }
            });
        }
    }, 100);

    handleSelectProfile = (id) => {
        const {currentUserId} = this.props;

        if (id === currentUserId) {
            const selectedId = {};
            selectedId[currentUserId] = true;

            this.startConversation(selectedId);
        } else {
            this.setState((prevState) => {
                const {selectedIds} = prevState;

                const wasSelected = selectedIds[id];

                // Prevent selecting too many users
                if (!wasSelected && Object.keys(selectedIds).length >= General.MAX_USERS_IN_GM - 1) {
                    return {};
                }

                const newSelectedIds = Object.assign({}, selectedIds);
                if (!wasSelected) {
                    newSelectedIds[id] = true;
                }

                return {
                    selectedIds: newSelectedIds,
                    selectedCount: Object.keys(newSelectedIds).length,
                };
            });

            this.clearSearch();
        }
    };

    handleRemoveProfile = (id) => {
        this.setState((prevState) => {
            const {selectedIds} = prevState;

            const newSelectedIds = Object.assign({}, selectedIds);

            Reflect.deleteProperty(newSelectedIds, id);

            return {
                selectedIds: newSelectedIds,
                selectedCount: Object.keys(newSelectedIds).length,
            };
        });
    };

    isStartEnabled = (state) => {
        if (state.startingConversation) {
            return false;
        }

        return state.selectedCount >= 1 && state.selectedCount <= General.MAX_USERS_IN_GM - 1;
    };

    loadedProfiles = ({data}) => {
        if (this.mounted) {
            const {profiles} = this.state;
            if (data && !data.length) {
                this.next = false;
            }

            this.page += 1;
            this.setState({loading: false, profiles: [...profiles, ...data]});
        }
    };

    makeDirectChannel = async (id) => {
        const {intl} = this.context;
        const {actions, allProfiles, teammateNameDisplay} = this.props;

        const user = allProfiles[id];

        const displayName = displayUsername(user, teammateNameDisplay);
        actions.setChannelDisplayName(displayName);

        const result = await actions.makeDirectChannel(id);

        if (result.error) {
            alertErrorWithFallback(
                intl,
                result.error,
                {
                    id: 'mobile.open_dm.error',
                    defaultMessage: "We couldn't open a direct message with {displayName}. Please check your connection and try again.",
                },
                {
                    displayName,
                }
            );
        }

        return !result.error;
    };

    makeGroupChannel = async (ids) => {
        const {intl} = this.context;
        const {
            actions,
            allProfiles,
            currentUserId,
            teammateNameDisplay,
        } = this.props;

        const result = await actions.makeGroupChannel(ids);
        const displayName = getGroupDisplayNameFromUserIds(ids, allProfiles, currentUserId, teammateNameDisplay);
        actions.setChannelDisplayName(displayName);

        if (result.error) {
            alertErrorWithFallback(
                intl,
                result.error,
                {
                    id: t('mobile.open_gm.error'),
                    defaultMessage: "We couldn't open a group message with those users. Please check your connection and try again.",
                }
            );
        }

        return !result.error;
    };

    onSearch = (text) => {
        if (text) {
            this.setState({term: text});
            clearTimeout(this.searchTimeoutId);

            this.searchTimeoutId = setTimeout(() => {
                this.searchProfiles(text);
            }, General.SEARCH_TIMEOUT_MILLISECONDS);
        } else {
            this.clearSearch();
        }
    };

    searchProfiles = (term) => {
        const lowerCasedTerm = term.toLowerCase();
        const {actions, currentTeamId, restrictDirectMessage} = this.props;
        this.setState({loading: true});

        if (restrictDirectMessage) {
            actions.searchProfiles(lowerCasedTerm).then(({data}) => {
                this.setState({searchResults: data, loading: false});
            });
        } else {
            actions.searchProfiles(lowerCasedTerm, {team_id: currentTeamId}).then(({data}) => {
                this.setState({searchResults: data, loading: false});
            });
        }
    };

    startConversation = async (selectedId) => {
        const {
            currentDisplayName,
            actions,
        } = this.props;

        if (this.state.startingConversation) {
            return;
        }

        this.setState({
            startingConversation: true,
        });

        // Save the current channel display name in case it fails
        const currentChannelDisplayName = currentDisplayName;

        const selectedIds = selectedId ? Object.keys(selectedId) : Object.keys(this.state.selectedIds);
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
            requestAnimationFrame(() => {
                this.close();
            });
        } else {
            this.setState({
                startingConversation: false,
            });

            actions.setChannelDisplayName(currentChannelDisplayName);
        }
    };

    updateNavigationButtons = (startEnabled, context = this.context) => {
        const {actions, componentId, theme} = this.props;
        const {formatMessage} = context.intl;
        actions.setButtons(componentId, {
            rightButtons: [{
                color: theme.sidebarHeaderTextColor,
                id: START_BUTTON,
                text: formatMessage({id: 'mobile.more_dms.start', defaultMessage: 'Start'}),
                showAsAction: 'always',
                enabled: startEnabled,
            }],
        });
    };

    renderItem = (props) => {
        // The list will re-render when the selection changes because it's passed into the list as extraData
        const selected = this.state.selectedIds[props.id];

        return (
            <UserListRow
                key={props.id}
                {...props}
                selectable={true}
                selected={selected}
                enabled={true}
            />
        );
    };

    renderLoading = () => {
        const {theme} = this.props;
        const {loading} = this.state;
        const style = getStyleFromTheme(theme);

        if (!loading) {
            return null;
        }

        return (
            <View style={style.loadingContainer}>
                <FormattedText
                    {...loadingText}
                    style={style.loadingText}
                />
            </View>
        );
    };

    renderNoResults = () => {
        const {loading} = this.state;
        const {theme} = this.props;
        const style = getStyleFromTheme(theme);

        if (loading || this.page === -1) {
            return null;
        }

        return (
            <View style={style.noResultContainer}>
                <FormattedText
                    id='mobile.custom_list.no_results'
                    defaultMessage='No Results'
                    style={style.noResultText}
                />
            </View>
        );
    };

    render() {
        const {formatMessage} = this.context.intl;
        const {currentUserId, theme, isLandscape} = this.props;
        const {
            loading,
            profiles,
            searchResults,
            selectedIds,
            selectedCount,
            startingConversation,
            term,
        } = this.state;
        const style = getStyleFromTheme(theme);

        if (startingConversation) {
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

        let data;
        let listType;
        if (term) {
            const exactMatches = [];
            const results = filterProfilesMatchingTerm(searchResults, term).filter((p) => {
                if (selectedCount > 0 && p.id === currentUserId) {
                    return false;
                }

                if (p.username === term || p.username.startsWith(term)) {
                    exactMatches.push(p);
                    return false;
                }

                return true;
            });
            data = [...exactMatches, ...results];
            listType = FLATLIST;
        } else {
            data = createProfilesSections(profiles);
            listType = SECTIONLIST;
        }

        return (
            <KeyboardLayout>
                <StatusBar/>
                <View style={[style.searchBar, padding(isLandscape)]}>
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
                        onChangeText={this.onSearch}
                        onSearchButtonPress={this.onSearch}
                        onCancelButtonPress={this.clearSearch}
                        autoCapitalize='none'
                        keyboardAppearance={getKeyboardAppearanceFromTheme(theme)}
                        value={term}
                    />
                    <SelectedUsers
                        selectedIds={this.state.selectedIds}
                        warnCount={5}
                        maxCount={7}
                        onRemove={this.handleRemoveProfile}
                    />
                </View>
                <CustomList
                    data={data}
                    extraData={selectedIds}
                    key='custom_list'
                    listType={listType}
                    loading={loading}
                    loadingComponent={this.renderLoading()}
                    noResults={this.renderNoResults()}
                    onLoadMore={this.getProfiles}
                    onRowPress={this.handleSelectProfile}
                    renderItem={this.renderItem}
                    theme={theme}
                />
            </KeyboardLayout>
        );
    }
}

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            flex: 1,
        },
        searchBar: {
            marginVertical: 5,
        },
        loadingContainer: {
            alignItems: 'center',
            backgroundColor: theme.centerChannelBg,
            height: 70,
            justifyContent: 'center',
        },
        loadingText: {
            color: changeOpacity(theme.centerChannelColor, 0.6),
        },
        noResultContainer: {
            flexGrow: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
        },
        noResultText: {
            fontSize: 26,
            color: changeOpacity(theme.centerChannelColor, 0.5),
        },
    };
});
