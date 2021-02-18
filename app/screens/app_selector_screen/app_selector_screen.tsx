// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import {intlShape} from 'react-intl';
import {
    Platform,
    View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {popTopScreen} from '@actions/navigation';
import CustomList, {FLATLIST} from '@components/custom_list';
import UserListRow from '@components/custom_list/user_list_row';
import ChannelListRow from '@components/custom_list/channel_list_row';
import OptionListRow from '@components/custom_list/option_list_row';
import FormattedText from '@components/formatted_text';
import SearchBar from '@components/search_bar';
import StatusBar from '@components/status_bar';
import {ViewTypes} from '@constants';
import {debounce} from '@mm-redux/actions/helpers';
import {General} from '@mm-redux/constants';
import {filterProfilesMatchingTerm} from '@mm-redux/utils/user_utils';
import {filterChannelsMatchingTerm} from '@mm-redux/utils/channel_utils';
import {memoizeResult} from '@mm-redux/utils/helpers';
import {t} from '@utils/i18n';
import {loadingText} from '@utils/member_list';
import {
    changeOpacity,
    makeStyleSheetFromTheme,
    getKeyboardAppearanceFromTheme,
} from '@utils/theme';
import {AppSelectOption} from '@mm-redux/types/apps';
import {Theme} from '@mm-redux/types/preferences';
import {ActionResult} from '@mm-redux/types/actions';
import {Channel} from '@mm-redux/types/channels';
import {UserProfile} from '@mm-redux/types/users';

type Props = {
    currentTeamId: string;
    data: OptionsData;
    dataSource?: string;
    onSelect: (option: UserProfile | Channel | AppSelectOption) => void;
    theme: Theme;
    performLookupCall?: (userInput: string) => Promise<AppSelectOption[]>;
    actions: {
        getProfiles: (page?: number, perPage?: number, options?: any) => Promise<ActionResult>;
        getChannels: (teamId: string, page?: number, perPage?: number) => Promise<ActionResult>;
        searchProfiles: (term: string, options?: any) => Promise<ActionResult>;
        searchChannels: (teamId: string, term: string, archived?: boolean) => Promise<ActionResult>;
    }
}

type State = {
    data: OptionsData;
    loading: boolean;
    searchResults: OptionsData;
    term: string;
}

type OptionsData = UserProfile[] | Channel[] | AppSelectOption[];

type RowProps = {
    id: string;
    item: UserProfile | Channel | AppSelectOption;
    selected: boolean;
    selectable: boolean;
    enabled: boolean;
    onPress: (id: string, item: UserProfile | Channel | AppSelectOption) => void;
}

export default class AppSelectorScreen extends PureComponent<Props, State> {
    private searchTimeoutId?: NodeJS.Timeout;
    private page = -1;
    private next: boolean;

    static contextTypes = {
        intl: intlShape.isRequired,
    };

    constructor(props: Props) {
        super(props);

        this.next = props.dataSource === ViewTypes.DATA_SOURCE_USERS ||
            props.dataSource === ViewTypes.DATA_SOURCE_CHANNELS ||
            props.dataSource === 'app';

        let data: OptionsData = [];
        if (!props.dataSource) {
            data = props.data;
        }

        this.state = {
            data,
            loading: false,
            searchResults: [],
            term: '',
        };
    }

    componentDidMount() {
        const {dataSource} = this.props;
        if (dataSource === ViewTypes.DATA_SOURCE_USERS) {
            this.getProfiles();
        } else if (dataSource === ViewTypes.DATA_SOURCE_CHANNELS) {
            this.getChannels();
        } else if (dataSource === 'app') {
            this.getAppOptions();
        }
    }

    clearSearch = () => {
        this.setState({term: '', searchResults: []});
    };

    close = () => {
        popTopScreen();
    };

    handleSelectItem = (id: string, item: UserProfile | Channel | AppSelectOption) => {
        this.props.onSelect(item);
        this.close();
    };

    getChannels = debounce(() => {
        const {actions, currentTeamId} = this.props;
        const {loading, term} = this.state;
        if (this.next && !loading && !term) {
            this.setState({loading: true}, () => {
                actions.getChannels(
                    currentTeamId,
                    this.page += 1,
                    General.CHANNELS_CHUNK_SIZE,
                ).then(this.loadedChannels);
            });
        }
    }, 100);

    getAppOptions = debounce(() => {
        const {performLookupCall} = this.props;
        const {loading, term} = this.state;
        if (this.next && !loading && !term) {
            this.setState({loading: true}, () => {
                performLookupCall?.(term).then(this.loadedAppOptions);
            });
        }
    }, 100)

    getDataResults = () => {
        const {dataSource} = this.props;
        const {data, searchResults, term} = this.state;

        const result = {
            data,
            listType: FLATLIST};
        if (term) {
            result.data = filterSearchData(dataSource, searchResults, term);
        }

        // TODO re-add this to add sections by first username letter if desired
        // } else if (dataSource === ViewTypes.DATA_SOURCE_USERS) {
        //     result.data = createProfilesSections(data);
        //     result.listType = SECTIONLIST;
        // }

        return result;
    };

    getProfiles = debounce(() => {
        const {loading, term} = this.state;
        if (this.next && !loading && !term) {
            this.setState({loading: true}, () => {
                const {actions} = this.props;

                actions.getProfiles(
                    this.page + 1,
                    General.PROFILE_CHUNK_SIZE,
                ).then(this.loadedProfiles);
            });
        }
    }, 100);

    loadedChannels = ({data: channels}: {data: Channel[]}) => {
        const data = this.state.data as Channel[];
        if (channels && !channels.length) {
            this.next = false;
        }

        this.page += 1;
        this.setState({loading: false, data: [...channels, ...data]});
    };

    loadedProfiles = ({data: profiles}: {data: UserProfile[]}) => {
        const data = this.state.data as UserProfile[];
        if (profiles && !profiles.length) {
            this.next = false;
        }

        this.page += 1;
        this.setState({loading: false, data: [...profiles, ...data]});
    };

    loadedAppOptions = (options: AppSelectOption[]) => {
        const data = this.state.data as AppSelectOption[];
        if (options && !options.length) {
            this.next = false;
        }

        this.page += 1;
        this.setState({loading: false, data: [...options, ...data]});
    }

    loadMore = () => {
        const {dataSource} = this.props;

        if (dataSource === ViewTypes.DATA_SOURCE_USERS) {
            this.getProfiles();
        } else if (dataSource === ViewTypes.DATA_SOURCE_CHANNELS) {
            this.getChannels();
        }
    };

    onSearch = (text: string) => {
        if (text) {
            const {dataSource, data} = this.props;
            this.setState({term: text});
            if (this.searchTimeoutId) {
                clearTimeout(this.searchTimeoutId);
            }

            this.searchTimeoutId = setTimeout(() => {
                if (!dataSource) {
                    this.setState({searchResults: filterSearchData(null, data, text)});
                    return;
                }

                if (dataSource === ViewTypes.DATA_SOURCE_USERS) {
                    this.searchProfiles(text);
                } else if (dataSource === ViewTypes.DATA_SOURCE_CHANNELS) {
                    this.searchChannels(text);
                }
            }, General.SEARCH_TIMEOUT_MILLISECONDS);
        } else {
            this.clearSearch();
        }
    };

    searchChannels = (term: string) => {
        const {actions, currentTeamId} = this.props;

        actions.searchChannels(currentTeamId, term.toLowerCase()).then(({data}) => {
            this.setState({searchResults: data, loading: false});
        });
    };

    searchProfiles = (term: string) => {
        const {actions} = this.props;
        this.setState({loading: true});

        actions.searchProfiles(term.toLowerCase()).then((results) => {
            let data = [];
            if (results.data) {
                data = results.data;
            }
            this.setState({searchResults: data, loading: false});
        });
    };

    renderLoading = () => {
        const {dataSource, theme} = this.props;
        const {loading} = this.state;
        const style = getStyleFromTheme(theme);

        if (!loading) {
            return null;
        }

        let text;
        switch (dataSource) {
        case ViewTypes.DATA_SOURCE_USERS:
            text = loadingText;
            break;
        case ViewTypes.DATA_SOURCE_CHANNELS:
            text = {
                id: t('mobile.loading_channels'),
                defaultMessage: 'Loading Channels...',
            };
            break;
        default:
            text = {
                id: t('mobile.loading_options'),
                defaultMessage: 'Loading Options...',
            };
            break;
        }

        return (
            <View style={style.loadingContainer}>
                <FormattedText
                    {...text}
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

    renderChannelItem = (props: RowProps) => {
        return <ChannelListRow {...props}/>;
    };

    renderOptionItem = (props: RowProps) => {
        const item = props.item as AppSelectOption;
        const newProps = {
            ...props,
            item: {text: item.label, value: item.value},
            onPress: (id: string, option: {text: string, value: string}) => {
                props.onPress(id, {label: option.text, value: option.value});
            },
        };
        return <OptionListRow {...newProps}/>;
    };

    renderUserItem = (props: RowProps) => {
        return <UserListRow {...props}/>;
    };

    render() {
        const {formatMessage} = this.context.intl;
        const {theme, dataSource} = this.props;
        const {loading, term} = this.state;
        const style = getStyleFromTheme(theme);

        const searchBarInput = {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.2),
            color: theme.centerChannelColor,
            fontSize: 15,
        };

        let rowComponent;
        if (dataSource === ViewTypes.DATA_SOURCE_USERS) {
            rowComponent = this.renderUserItem;
        } else if (dataSource === ViewTypes.DATA_SOURCE_CHANNELS) {
            rowComponent = this.renderChannelItem;
        } else {
            rowComponent = this.renderOptionItem;
        }

        const {data, listType} = this.getDataResults();

        return (
            <SafeAreaView style={style.container}>
                <StatusBar/>
                <View
                    testID='selector.screen'
                    style={style.searchBar}
                >
                    <SearchBar
                        testID='selector.search_bar'
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
                    key='custom_list'
                    listType={listType}
                    loading={loading}
                    loadingComponent={this.renderLoading()}
                    noResults={this.renderNoResults()}
                    onLoadMore={this.loadMore}
                    onRowPress={this.handleSelectItem}
                    renderItem={rowComponent}
                    theme={theme}
                />
            </SafeAreaView>
        );
    }
}

const getStyleFromTheme = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            flex: 1,
        },
        searchBar: {
            marginVertical: 5,
            height: 38,
            ...Platform.select({
                ios: {
                    paddingLeft: 8,
                },
            }),
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

const filterSearchData = memoizeResult((dataSource: string, data: OptionsData, term: string): OptionsData => {
    if (!data) {
        return [];
    }

    const lowerCasedTerm = term.toLowerCase();
    if (dataSource === ViewTypes.DATA_SOURCE_USERS) {
        const users = data as UserProfile[];
        return filterProfilesMatchingTerm(users, lowerCasedTerm);
    } else if (dataSource === ViewTypes.DATA_SOURCE_CHANNELS) {
        const channels = data as Channel[];
        return filterChannelsMatchingTerm(channels, lowerCasedTerm);
    }

    const options = data as AppSelectOption[];
    return options.filter((option) => option.label && option.label.toLowerCase().startsWith(lowerCasedTerm));
});
