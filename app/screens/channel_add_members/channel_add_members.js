// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {intlShape} from 'react-intl';
import {
    Alert,
    Platform,
    View,
} from 'react-native';
import {Navigation} from 'react-native-navigation';

import {debounce} from 'mattermost-redux/actions/helpers';
import {General} from 'mattermost-redux/constants';
import {filterProfilesMatchingTerm} from 'mattermost-redux/utils/user_utils';
import {paddingHorizontal as padding} from 'app/components/safe_area_view/iphone_x_spacing';
import Loading from 'app/components/loading';
import CustomList, {FLATLIST, SECTIONLIST} from 'app/components/custom_list';
import UserListRow from 'app/components/custom_list/user_list_row';
import FormattedText from 'app/components/formatted_text';
import KeyboardLayout from 'app/components/layout/keyboard_layout';
import SearchBar from 'app/components/search_bar';
import StatusBar from 'app/components/status_bar';
import {alertErrorIfInvalidPermissions} from 'app/utils/general';
import {createProfilesSections, loadingText} from 'app/utils/member_list';
import {
    changeOpacity,
    makeStyleSheetFromTheme,
    setNavigatorStyles,
    getKeyboardAppearanceFromTheme,
} from 'app/utils/theme';

export default class ChannelAddMembers extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            getTeamStats: PropTypes.func.isRequired,
            getProfilesNotInChannel: PropTypes.func.isRequired,
            handleAddChannelMembers: PropTypes.func.isRequired,
            searchProfiles: PropTypes.func.isRequired,
            setButtons: PropTypes.func.isRequired,
            popTopScreen: PropTypes.func.isRequired,
        }).isRequired,
        componentId: PropTypes.string,
        currentChannelId: PropTypes.string.isRequired,
        currentChannelGroupConstrained: PropTypes.bool,
        currentTeamId: PropTypes.string.isRequired,
        currentUserId: PropTypes.string.isRequired,
        profilesNotInChannel: PropTypes.array.isRequired,
        theme: PropTypes.object.isRequired,
        isLandscape: PropTypes.bool.isRequired,
    };

    static defaultProps = {
        currentChannelGroupConstrained: false,
    };

    static contextTypes = {
        intl: intlShape.isRequired,
    };

    constructor(props, context) {
        super(props, context);

        this.searchTimeoutId = 0;
        this.page = -1;
        this.next = true;

        this.state = {
            adding: false,
            loading: false,
            searchResults: [],
            selectedIds: {},
            term: '',
        };

        this.addButton = {
            enalbed: false,
            id: 'add-members',
            text: context.intl.formatMessage({id: 'integrations.add', defaultMessage: 'Add'}),
            color: props.theme.sidebarHeaderTextColor,
            showAsAction: 'always',
        };

        props.actions.setButtons(props.componentId, {
            rightButtons: [this.addButton],
        });
    }

    componentDidMount() {
        this.navigationEventListener = Navigation.events().bindComponent(this);

        const {actions, currentTeamId} = this.props;

        actions.getTeamStats(currentTeamId);
        this.getProfiles();

        this.enableAddOption(false);
    }

    componentDidUpdate(prevProps) {
        const {componentId, theme} = this.props;
        const {adding, selectedIds} = this.state;
        const enabled = Object.keys(selectedIds).length > 0 && !adding;

        this.enableAddOption(enabled);

        if (theme !== prevProps.theme) {
            setNavigatorStyles(componentId, theme);
        }
    }

    navigationButtonPressed({buttonId}) {
        if (buttonId === this.addButton.id) {
            this.handleAddMembersPress();
        }
    }

    clearSearch = () => {
        this.setState({term: '', searchResults: []});
    };

    close = () => {
        this.props.actions.popTopScreen();
    };

    enableAddOption = (enabled) => {
        const {actions, componentId} = this.props;
        actions.setButtons(componentId, {
            rightButtons: [{...this.addButton, enabled}],
        });
    };

    getProfiles = debounce(() => {
        const {loading, term} = this.state;
        if (this.next && !loading && !term) {
            this.setState({loading: true}, () => {
                const {actions, currentChannelId, currentChannelGroupConstrained, currentTeamId} = this.props;

                actions.getProfilesNotInChannel(
                    currentTeamId,
                    currentChannelId,
                    currentChannelGroupConstrained,
                    this.page + 1,
                    General.PROFILE_CHUNK_SIZE
                ).then(this.onProfilesLoaded);
            });
        }
    }, 100);

    handleAddMembersPress = () => {
        const {formatMessage} = this.context.intl;
        const {actions, currentChannelId} = this.props;
        const {selectedIds, adding} = this.state;
        const membersToAdd = Object.keys(selectedIds).filter((id) => selectedIds[id]);

        if (!membersToAdd.length) {
            Alert.alert(
                formatMessage({id: 'channel_header.addMembers', defaultMessage: 'Add Members'}),
                formatMessage({
                    id: 'mobile.channel_members.add_members_alert',
                    defaultMessage: 'You must select at least one member to add to the channel.',
                })
            );

            return;
        }

        if (!adding) {
            this.enableAddOption(false);
            this.setState({adding: true}, async () => {
                const result = await actions.handleAddChannelMembers(currentChannelId, membersToAdd);

                if (result.error) {
                    alertErrorIfInvalidPermissions(result);
                    this.enableAddOption(true);
                    this.setState({adding: false});
                } else {
                    this.close();
                }
            });
        }
    };

    handleSelectProfile = (id) => {
        const {selectedIds} = this.state;
        const newSelected = Object.assign({}, selectedIds, {[id]: !selectedIds[id]});

        if (Object.values(newSelected).filter((selected) => selected).length) {
            this.enableAddOption(true);
        } else {
            this.enableAddOption(false);
        }

        this.setState({selectedIds: newSelected});
    };

    onProfilesLoaded = ({data}) => {
        if (data && !data.length) {
            this.next = false;
        }

        this.page += 1;
        this.setState({
            loading: false,
        });
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

    searchProfiles = (term) => {
        const {actions, currentChannelId, currentChannelGroupConstrained, currentTeamId} = this.props;
        const options = {not_in_channel_id: currentChannelId, team_id: currentTeamId, group_constrained: currentChannelGroupConstrained};
        this.setState({loading: true});

        actions.searchProfiles(term.toLowerCase(), options).then(({data}) => {
            this.setState({searchResults: data, loading: false});
        });
    };

    render() {
        const {formatMessage} = this.context.intl;
        const {currentUserId, profilesNotInChannel, theme, isLandscape} = this.props;
        const {
            adding,
            loading,
            searchResults,
            selectedIds,
            term,
        } = this.state;
        const style = getStyleFromTheme(theme);

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

        let data;
        let listType;
        if (term) {
            const exactMatches = [];
            const results = filterProfilesMatchingTerm(searchResults, term).filter((p) => {
                if (p.id === currentUserId) {
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
            data = createProfilesSections(profilesNotInChannel.filter((user) => user.delete_at === 0));
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
                    isLandscape={isLandscape}
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
