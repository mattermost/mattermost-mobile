// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {injectIntl, intlShape} from 'react-intl';
import {
    InteractionManager,
    Platform,
    View,
} from 'react-native';

import CustomList from 'app/components/custom_list';
import UserListRow from 'app/components/custom_list/user_list_row';
import ChannelListRow from 'app/components/custom_list/channel_list_row';
import OptionListRow from 'app/components/custom_list/option_list_row';
import SearchBar from 'app/components/search_bar';
import StatusBar from 'app/components/status_bar';
import {loadingText} from 'app/utils/member_list';
import {changeOpacity, makeStyleSheetFromTheme, setNavigatorStyles} from 'app/utils/theme';
import {ViewTypes} from 'app/constants';

import {General, RequestStatus} from 'mattermost-redux/constants';
import {filterProfilesMatchingTerm} from 'mattermost-redux/utils/user_utils';
import {filterChannelsMatchingTerm} from 'mattermost-redux/utils/channel_utils';
import {memoizeResult} from 'mattermost-redux/utils/helpers';

class MenuActionSelector extends PureComponent {
    static propTypes = {
        intl: intlShape.isRequired,
        theme: PropTypes.object.isRequired,
        navigator: PropTypes.object,
        data: PropTypes.arrayOf(PropTypes.object),
        dataSource: PropTypes.string,
        onSelect: PropTypes.func.isRequired,
        currentTeamId: PropTypes.string.isRequired,
        loadMoreRequestStatus: PropTypes.string,
        searchRequestStatus: PropTypes.string,
        actions: PropTypes.shape({
            getProfiles: PropTypes.func.isRequired,
            getChannels: PropTypes.func.isRequired,
            searchProfiles: PropTypes.func.isRequired,
            searchChannels: PropTypes.func.isRequired,
        }),
    };

    constructor(props) {
        super(props);

        this.searchTimeoutId = 0;

        let data = [];
        if (!props.dataSource) {
            data = props.data;
        }

        const needsLoading = props.dataSource === ViewTypes.DATA_SOURCE_USERS || props.dataSource === ViewTypes.DATA_SOURCE_CHANNELS;

        this.state = {
            next: needsLoading,
            page: 0,
            data,
            searching: false,
            showNoResults: false,
            term: '',
            isLoading: needsLoading,
            prevLoadMoreRequestStatus: RequestStatus.STARTED,
        };

        props.navigator.setOnNavigatorEvent(this.onNavigatorEvent);
    }

    componentDidMount() {
        InteractionManager.runAfterInteractions(() => {
            if (this.props.dataSource === ViewTypes.DATA_SOURCE_USERS) {
                this.props.actions.getProfiles().then(() => this.setState({isLoading: false}));
            } else if (this.props.dataSource === ViewTypes.DATA_SOURCE_CHANNELS) {
                this.props.actions.getChannels(this.props.currentTeamId).then(() => this.setState({isLoading: false}));
            }
        });
    }

    componentDidUpdate(prevProps) {
        if (this.props.theme !== prevProps.theme) {
            setNavigatorStyles(this.props.navigator, this.props.theme);
        }
    }

    cancelSearch = () => {
        this.setState({
            searching: false,
            isLoading: false,
            term: '',
            page: 0,
            data: filterPageData(this.props.data, 0),
        });
    };

    close = () => {
        this.props.navigator.pop({animated: true});
    };

    handleRowSelect = (id, selected) => {
        this.props.onSelect(selected);
        this.close();
    };

    loadMore = async () => {
        const {actions, loadMoreRequestStatus, currentTeamId, dataSource} = this.props;
        const {next, searching} = this.state;
        let {page} = this.state;

        if (loadMoreRequestStatus !== RequestStatus.STARTED && next && !searching) {
            page = page + 1;

            let results;
            if (dataSource === ViewTypes.DATA_SOURCE_USERS) {
                results = await actions.getProfiles(page, General.PROFILE_CHUNK_SIZE);
            } else if (dataSource === ViewTypes.DATA_SOURCE_CHANNELS) {
                results = await actions.getChannels(currentTeamId, page, General.PROFILE_CHUNK_SIZE);
            } else {
                return;
            }

            if (results.data && results.data.length) {
                this.setState({
                    isLoading: false,
                    page,
                });
            } else {
                this.setState({
                    isLoading: false,
                    next: false,
                });
            }
        }
    };

    searchProfiles = (text) => {
        const term = text;
        const {actions, currentTeamId, dataSource} = this.props;

        if (term) {
            if (!dataSource) {
                this.setState({data: filterSearchData(null, this.props.data, term.toLowerCase())});
                return;
            }

            this.setState({searching: true, isLoading: true, term});
            clearTimeout(this.searchTimeoutId);

            this.searchTimeoutId = setTimeout(async () => {
                if (dataSource === ViewTypes.DATA_SOURCE_USERS) {
                    await actions.searchProfiles(term.toLowerCase());
                } else if (dataSource === ViewTypes.DATA_SOURCE_CHANNELS) {
                    await actions.searchChannels(currentTeamId, term.toLowerCase());
                }
                this.setState({isLoading: false});
            }, General.SEARCH_TIMEOUT_MILLISECONDS);
        } else {
            this.cancelSearch();
        }
    };

    render() {
        const {intl, data, theme, dataSource} = this.props;
        const {searching, term, page} = this.state;
        const {formatMessage} = intl;
        const style = getStyleFromTheme(theme);
        const more = searching ? () => true : this.loadMore;

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

        let rowComponent;
        if (dataSource === ViewTypes.DATA_SOURCE_USERS) {
            rowComponent = UserListRow;
        } else if (dataSource === ViewTypes.DATA_SOURCE_CHANNELS) {
            rowComponent = ChannelListRow;
        } else {
            rowComponent = OptionListRow;
        }

        let filteredData;
        if (searching) {
            filteredData = filterSearchData(dataSource, data, term);
        } else {
            filteredData = filterPageData(data, page);
        }

        return (
            <View style={style.container}>
                <StatusBar/>
                <View
                    style={style.searchContainer}
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
                    data={filteredData}
                    theme={theme}
                    searching={searching}
                    onListEndReached={more}
                    listScrollRenderAheadDistance={50}
                    loading={this.state.isLoading}
                    loadingText={loadingText}
                    selectable={false}
                    onRowPress={this.handleRowSelect}
                    renderRow={rowComponent}
                    showNoResults={this.state.showNoResults}
                    showSections={false}
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
        searchContainer: {
            marginVertical: 5,
        },
    };
});

const filterPageData = memoizeResult((data, page) => {
    return data.slice(0, (page + 1) * General.PROFILE_CHUNK_SIZE);
});

const filterSearchData = memoizeResult((dataSource, data, term) => {
    if (!data) {
        return [];
    }

    if (dataSource === ViewTypes.DATA_SOURCE_USERS) {
        return filterProfilesMatchingTerm(data, term);
    } else if (dataSource === ViewTypes.DATA_SOURCE_CHANNELS) {
        return filterChannelsMatchingTerm(data, term);
    }

    return data.filter((option) => option.text && option.text.toLowerCase().startsWith(term));
});

export default injectIntl(MenuActionSelector);
