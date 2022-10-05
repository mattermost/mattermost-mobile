// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {debounce} from '@mm-redux/actions/helpers';
import {General} from '@mm-redux/constants';
import {ActionResult} from '@mm-redux/types/actions';
import {Channel} from '@mm-redux/types/channels';
import {DialogOption} from '@mm-redux/types/integrations';
import {Theme} from '@mm-redux/types/theme';
import {UserProfile} from '@mm-redux/types/users';
import {Dictionary} from '@mm-redux/types/utilities';
import {filterChannelsMatchingTerm} from '@mm-redux/utils/channel_utils';
import {memoizeResult} from '@mm-redux/utils/helpers';
import {filterProfilesMatchingTerm} from '@mm-redux/utils/user_utils';
import React, {PureComponent} from 'react';
import {intlShape} from 'react-intl';
import {
    Platform,
    ScrollView,
    View,
} from 'react-native';
import {EventSubscription, Navigation} from 'react-native-navigation';
import {SafeAreaView} from 'react-native-safe-area-context';

import {popTopScreen} from '@actions/navigation';
import CustomList, {FLATLIST, SECTIONLIST} from '@components/custom_list';
import ChannelListRow from '@components/custom_list/channel_list_row';
import OptionListRow from '@components/custom_list/option_list_row';
import UserListRow from '@components/custom_list/user_list_row';
import FormattedText from '@components/formatted_text';
import SearchBar from '@components/search_bar';
import StatusBar from '@components/status_bar';
import {ViewTypes} from '@constants';
import {t} from '@utils/i18n';
import {createProfilesSections, loadingText} from '@utils/member_list';
import {
    changeOpacity,
    makeStyleSheetFromTheme,
    getKeyboardAppearanceFromTheme,
} from '@utils/theme';

import SelectedOptions from './selected_options';

type DataType = DialogOption[] | Channel[] | UserProfile[];
type Selection = DialogOption | Channel | UserProfile | DialogOption[] | Channel[] | UserProfile[];
type MultiselectSelectedMap = Dictionary<DialogOption> | Dictionary<Channel> | Dictionary<UserProfile>;

type Props = {
    actions: {
        getProfiles: (page?: number, perPage?: number, options?: any) => Promise<ActionResult>;
        getChannels: (teamId: string, page?: number, perPage?: number) => Promise<ActionResult>;
        searchProfiles: (term: string, options?: any) => Promise<ActionResult>;
        searchChannels: (teamId: string, term: string, archived?: boolean | undefined) => Promise<ActionResult>;
    };
    getDynamicOptions?: (term: string) => Promise<ActionResult>;
    currentTeamId: string;
    data?: DataType;
    dataSource: string;
    onSelect: (opt: Selection) => void;
    isMultiselect?: boolean;
    selected?: DialogOption[];
    theme: Theme;
}

type State = {
    data: DataType | Array<{id: string; data: DataType}>;
    loading: boolean;
    searchResults: DialogOption[];
    term: string;
    multiselectSelected: MultiselectSelectedMap;
}

export default class SelectorScreen extends PureComponent<Props, State> {
    static contextTypes = {
        intl: intlShape.isRequired,
    };

    private navigationEventListener?: EventSubscription;

    private searchTimeoutId = 0;
    private page = -1;
    private next: boolean;
    private searchBarRef = React.createRef<SearchBar>();
    private selectedScroll = React.createRef<ScrollView>();
    constructor(props: Props) {
        super(props);

        this.next = props.dataSource === ViewTypes.DATA_SOURCE_USERS || props.dataSource === ViewTypes.DATA_SOURCE_CHANNELS || props.dataSource === ViewTypes.DATA_SOURCE_DYNAMIC;

        let data: DataType = [];
        if (!props.dataSource) {
            data = props.data || [];
        }

        const multiselectSelected: MultiselectSelectedMap = {};
        if (props.isMultiselect && props.selected && !([ViewTypes.DATA_SOURCE_USERS, ViewTypes.DATA_SOURCE_CHANNELS].includes(props.dataSource))) {
            props.selected.forEach((opt) => {
                multiselectSelected[opt.value] = opt;
            });
        }

        this.state = {
            data,
            loading: false,
            searchResults: [],
            term: '',
            multiselectSelected,
        };
    }

    componentDidMount() {
        this.navigationEventListener = Navigation.events().bindComponent(this);
        const {dataSource} = this.props;
        if (dataSource === ViewTypes.DATA_SOURCE_USERS) {
            this.getProfiles();
        } else if (dataSource === ViewTypes.DATA_SOURCE_CHANNELS) {
            this.getChannels();
        } else if (dataSource === ViewTypes.DATA_SOURCE_DYNAMIC) {
            this.getDynamicOptions();
        }
    }

    clearSearch = () => {
        this.setState({term: '', searchResults: []});
    };

    close = () => {
        popTopScreen();
    };

    handleSelectItem = (id: string, item: UserProfile | Channel | DialogOption) => {
        if (!this.props.isMultiselect) {
            this.props.onSelect(item);
            this.close();
            return;
        }

        switch (this.props.dataSource) {
            case ViewTypes.DATA_SOURCE_USERS: {
                const currentSelected = this.state.multiselectSelected as Dictionary<UserProfile>;
                const typedItem = item as UserProfile;
                const multiselectSelected = {...currentSelected};
                if (currentSelected[typedItem.id]) {
                    delete multiselectSelected[typedItem.id];
                } else {
                    multiselectSelected[typedItem.id] = typedItem;
                }
                this.setState({multiselectSelected});
                break;
            }
            case ViewTypes.DATA_SOURCE_CHANNELS: {
                const currentSelected = this.state.multiselectSelected as Dictionary<Channel>;
                const typedItem = item as Channel;
                const multiselectSelected = {...currentSelected};
                if (currentSelected[typedItem.id]) {
                    delete multiselectSelected[typedItem.id];
                } else {
                    multiselectSelected[typedItem.id] = typedItem;
                }
                this.setState({multiselectSelected});
                break;
            }
            default: {
                const currentSelected = this.state.multiselectSelected as Dictionary<DialogOption>;
                const typedItem = item as DialogOption;
                const multiselectSelected = {...currentSelected};
                if (currentSelected[typedItem.value]) {
                    delete multiselectSelected[typedItem.value];
                } else {
                    multiselectSelected[typedItem.value] = typedItem;
                }
                this.setState({multiselectSelected});
            }
        }

        setTimeout(() => {
            if (this.selectedScroll.current) {
                this.selectedScroll.current.scrollToEnd();
            }
        });
    };

    navigationButtonPressed({buttonId}: {buttonId: string}) {
        switch (buttonId) {
            case 'submit-form':
                this.props.onSelect(Object.values(this.state.multiselectSelected));
                this.close();
                return;
            case 'close-dialog':
                this.close();
        }
    }

    handleRemoveOption = (item: UserProfile | Channel | DialogOption) => {
        switch (this.props.dataSource) {
            case ViewTypes.DATA_SOURCE_USERS: {
                const currentSelected = this.state.multiselectSelected as Dictionary<UserProfile>;
                const typedItem = item as UserProfile;
                const multiselectSelected = {...currentSelected};
                delete multiselectSelected[typedItem.id];
                this.setState({multiselectSelected});
                return;
            }
            case ViewTypes.DATA_SOURCE_CHANNELS: {
                const currentSelected = this.state.multiselectSelected as Dictionary<Channel>;
                const typedItem = item as Channel;
                const multiselectSelected = {...currentSelected};
                delete multiselectSelected[typedItem.id];
                this.setState({multiselectSelected});
                return;
            }
            default: {
                const currentSelected = this.state.multiselectSelected as Dictionary<DialogOption>;
                const typedItem = item as DialogOption;
                const multiselectSelected = {...currentSelected};
                delete multiselectSelected[typedItem.value];
                this.setState({multiselectSelected});
            }
        }
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

    getDataResults = () => {
        const {dataSource} = this.props;
        const {data, searchResults, term} = this.state;

        const result = {
            data: data as any,
            listType: FLATLIST};
        if (term) {
            result.data = filterSearchData(dataSource, searchResults, term);
        } else if (dataSource === ViewTypes.DATA_SOURCE_USERS) {
            result.data = createProfilesSections(data);
            result.listType = SECTIONLIST;
        }

        if (!dataSource || dataSource === ViewTypes.DATA_SOURCE_DYNAMIC) {
            result.data = result.data.map((value: DialogOption) => {
                return {...value, id: (value).value};
            });
        }

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

    getDynamicOptions = debounce(() => {
        const {loading, term} = this.state;
        if (this.next && !loading && !term) {
            this.searchDynamicOptions('');
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

    loadMore = () => {
        const {dataSource} = this.props;

        if (dataSource === ViewTypes.DATA_SOURCE_USERS) {
            this.getProfiles();
        } else if (dataSource === ViewTypes.DATA_SOURCE_CHANNELS) {
            this.getChannels();
        }

        // dynamic options are not paged so are not reloaded on scroll
    };

    onSearch = (text: string) => {
        if (text) {
            const {dataSource, data} = this.props;
            this.setState({term: text});
            clearTimeout(this.searchTimeoutId);

            this.searchTimeoutId = setTimeout(() => {
                if (!dataSource) {
                    this.setState({searchResults: filterSearchData(null, data, text)});
                    return;
                }

                if (dataSource === ViewTypes.DATA_SOURCE_USERS) {
                    this.searchProfiles(text);
                } else if (dataSource === ViewTypes.DATA_SOURCE_CHANNELS) {
                    this.searchChannels(text);
                } else if (dataSource === ViewTypes.DATA_SOURCE_DYNAMIC) {
                    this.searchDynamicOptions(text);
                }
            }, General.SEARCH_TIMEOUT_MILLISECONDS) as any;
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

    searchDynamicOptions = (term = '') => {
        if (!this.props.getDynamicOptions) {
            return;
        }

        this.setState({loading: true});

        this.props.getDynamicOptions(term.toLowerCase()).then((results) => {
            let data = [];
            if (results.data) {
                data = results.data;
            }

            if (term) {
                this.setState({searchResults: data, loading: false});
            } else {
                this.setState({data, loading: false});
            }
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

    renderChannelItem = (props: any) => {
        const selected = Boolean(this.state.multiselectSelected[props.id]);
        return (
            <ChannelListRow
                key={props.id}
                {...props}
                selectable={true}
                selected={selected}
            />
        );
    };

    renderOptionItem = (props: any) => {
        const selected = Boolean(this.state.multiselectSelected[props.id]);
        return (
            <OptionListRow
                key={props.id}
                {...props}
                selectable={true}
                selected={selected}
            />
        );
    };

    renderUserItem = (props: any) => {
        const selected = Boolean(this.state.multiselectSelected[props.id]);
        return (
            <UserListRow
                key={props.id}
                {...props}
                selectable={true}
                selected={selected}
            />
        );
    };

    render() {
        // @ts-expect-error context type definition
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

        let selectedOptionsComponent = null;
        const selectedItems = Object.values(this.state.multiselectSelected);
        if (selectedItems.length > 0) {
            selectedOptionsComponent = (
                <>
                    <SelectedOptions
                        ref={this.selectedScroll}
                        selectedOptions={selectedItems}
                        dataSource={this.props.dataSource}
                        onRemove={this.handleRemoveOption}
                    />
                    <View style={style.separator}/>
                </>
            );
        }

        return (
            <SafeAreaView style={style.container}>
                <StatusBar/>
                <View
                    testID='selector.screen'
                    style={style.searchBar}
                >
                    <SearchBar
                        testID='selector.search_bar'
                        ref={this.searchBarRef}
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
                {selectedOptionsComponent}
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
        separator: {
            height: 1,
            flex: 0,
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.1),
        },
    };
});

const filterSearchData = memoizeResult((dataSource: string, data: DataType, term: string) => {
    if (!data) {
        return [];
    }

    const lowerCasedTerm = term.toLowerCase();
    if (dataSource === ViewTypes.DATA_SOURCE_USERS) {
        return filterProfilesMatchingTerm(data as UserProfile[], lowerCasedTerm);
    } else if (dataSource === ViewTypes.DATA_SOURCE_CHANNELS) {
        return filterChannelsMatchingTerm(data as Channel[], lowerCasedTerm);
    } else if (dataSource === ViewTypes.DATA_SOURCE_DYNAMIC) {
        return data;
    }

    return (data as DialogOption[]).filter((option) => option.text && option.text.toLowerCase().startsWith(lowerCasedTerm));
});
