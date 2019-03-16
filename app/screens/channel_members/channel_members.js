// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Alert,
    Platform,
    View,
} from 'react-native';
import {intlShape} from 'react-intl';

import {debounce} from 'mattermost-redux/actions/helpers';
import {General} from 'mattermost-redux/constants';
import {filterProfilesMatchingTerm} from 'mattermost-redux/utils/user_utils';

import Loading from 'app/components/loading';
import CustomList, {FLATLIST, SECTIONLIST} from 'app/components/custom_list';
import UserListRow from 'app/components/custom_list/user_list_row';
import FormattedText from 'app/components/formatted_text';
import KeyboardLayout from 'app/components/layout/keyboard_layout';
import SearchBar from 'app/components/search_bar';
import StatusBar from 'app/components/status_bar';
import {alertErrorIfInvalidPermissions} from 'app/utils/general';
import {createProfilesSections, loadingText} from 'app/utils/member_list';
import {changeOpacity, makeStyleSheetFromTheme, setNavigatorStyles} from 'app/utils/theme';

export default class ChannelMembers extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            getProfilesInChannel: PropTypes.func.isRequired,
            handleRemoveChannelMembers: PropTypes.func.isRequired,
            searchProfiles: PropTypes.func.isRequired,
        }).isRequired,
        canManageUsers: PropTypes.bool.isRequired,
        currentChannelId: PropTypes.string.isRequired,
        currentChannelMembers: PropTypes.array,
        currentUserId: PropTypes.string.isRequired,
        navigator: PropTypes.object,
        theme: PropTypes.object.isRequired,
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
            loading: false,
            profiles: [],
            removing: false,
            searchResults: [],
            selectedIds: {},
            term: '',
        };

        this.removeButton = {
            disabled: true,
            id: 'remove-members',
            showAsAction: 'always',
            title: context.intl.formatMessage({id: 'channel_members_modal.remove', defaultMessage: 'Remove'}),
        };

        props.navigator.setOnNavigatorEvent(this.onNavigatorEvent);
        if (props.canManageUsers) {
            props.navigator.setButtons({
                rightButtons: [this.removeButton],
            });
        }
    }

    componentDidMount() {
        this.getProfiles();
    }

    componentDidUpdate(prevProps) {
        const {navigator, theme} = this.props;
        const {removing, selectedIds} = this.state;
        const enabled = Object.keys(selectedIds).length > 0 && !removing;

        this.enableRemoveOption(enabled);

        if (theme !== prevProps.theme) {
            setNavigatorStyles(navigator, theme);
        }
    }

    clearSearch = () => {
        this.setState({term: '', searchResults: []});
    };

    close = () => {
        this.props.navigator.pop({animated: true});
    };

    enableRemoveOption = (enabled) => {
        if (this.props.canManageUsers) {
            this.props.navigator.setButtons({
                rightButtons: [{...this.removeButton, disabled: !enabled}],
            });
        }
    };

    getProfiles = debounce(() => {
        const {loading, term} = this.state;
        if (this.next && !loading && !term) {
            this.setState({loading: true}, () => {
                const {actions, currentChannelId} = this.props;

                actions.getProfilesInChannel(
                    currentChannelId,
                    this.page + 1,
                    General.PROFILE_CHUNK_SIZE
                ).then(this.loadedProfiles);
            });
        }
    }, 100);

    handleRemoveMembersPress = () => {
        const {formatMessage} = this.context.intl;
        const {selectedIds, removing} = this.state;
        const membersToRemove = Object.keys(selectedIds).filter((id) => selectedIds[id]);

        if (!membersToRemove.length) {
            Alert.alert(
                formatMessage({
                    id: 'mobile.routes.channel_members.action',
                    defaultMessage: 'Remove Members',
                }),
                formatMessage({
                    id: 'mobile.routes.channel_members.action_message',
                    defaultMessage: 'You must select at least one member to remove from the channel.',
                })
            );
            return;
        }

        if (!removing) {
            Alert.alert(
                formatMessage({
                    id: 'mobile.routes.channel_members.action',
                    defaultMessage: 'Remove Members',
                }),
                formatMessage({
                    id: 'mobile.routes.channel_members.action_message_confirm',
                    defaultMessage: 'Are you sure you want to remove the selected members from the channel?',
                }),
                [{
                    text: formatMessage({id: 'mobile.channel_list.alertNo', defaultMessage: 'No'}),
                }, {
                    text: formatMessage({id: 'mobile.channel_list.alertYes', defaultMessage: 'Yes'}),
                    onPress: () => this.removeMembers(membersToRemove),
                }]
            );
        }
    };

    handleSelectProfile = (id) => {
        const {canManageUsers} = this.props;
        const {selectedIds} = this.state;

        if (canManageUsers) {
            const newSelected = Object.assign({}, selectedIds, {[id]: !selectedIds[id]});

            if (Object.values(newSelected).filter((selected) => selected).length) {
                this.enableRemoveOption(true);
            } else {
                this.enableRemoveOption(false);
            }

            this.setState({selectedIds: newSelected});
        }
    };

    loadedProfiles = ({data}) => {
        const {profiles} = this.state;
        if (data && !data.length) {
            this.next = false;
        }

        this.page += 1;
        this.setState({loading: false, profiles: [...profiles, ...data]});
    };

    onNavigatorEvent = (event) => {
        if (event.type === 'NavBarButtonPress') {
            if (event.id === this.removeButton.id) {
                this.handleRemoveMembersPress();
            }
        }
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

    removeMembers = async (membersToRemove) => {
        const {actions, currentChannelId} = this.props;
        this.enableRemoveOption(false);
        this.setState({adding: true}, async () => {
            const result = await actions.handleRemoveChannelMembers(currentChannelId, membersToRemove);

            if (result.error) {
                alertErrorIfInvalidPermissions(result);
                this.enableRemoveOption(true);
                this.setState({removing: false});
            } else {
                this.close();
            }
        });
    };

    renderItem = (props) => {
        // The list will re-render when the selection changes because it's passed into the list as extraData
        const selected = this.state.selectedIds[props.id];
        const enabled = props.id !== this.props.currentUserId;

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
        const {actions, currentChannelId} = this.props;
        const options = {in_channel_id: currentChannelId};
        this.setState({loading: true});

        actions.searchProfiles(term.toLowerCase(), options).then(({data}) => {
            this.setState({searchResults: data, loading: false});
        });
    };

    render() {
        const {formatMessage} = this.context.intl;
        const {theme} = this.props;
        const {
            removing,
            loading,
            profiles,
            searchResults,
            selectedIds,
            term,
        } = this.state;
        const style = getStyleFromTheme(theme);

        if (removing) {
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
                <View style={style.searchBar}>
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
