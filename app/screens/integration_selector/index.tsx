// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import SearchBar from '@components/search';
import { changeOpacity, getKeyboardAppearanceFromTheme, makeStyleSheetFromTheme } from '@utils/theme';
import { useTheme } from '@context/theme';

import CustomList from './custom_list';
import { useIntl } from 'react-intl';

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

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            flex: 1,
        },
        searchBar: {
            marginVertical: 5,
            height: 38,
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

function IntegrationSelector({ }: Props) {
    // TODO State
    type State = {
        data: DataType | Array<{ id: string; data: DataType }>;
        loading: boolean;
        searchResults: DialogOption[];
        term: string;
        multiselectSelected: MultiselectSelectedMap;
    }

    const theme = useTheme();
    const style = getStyleSheet(theme);
    const searchBarInput = ""
    const term = ""
    const listType = "FLATLIST"
    const intl = useIntl();


    // navigationEventListener ?: EventSubscription;
    const searchTimeoutId = 0;
    const page = -1;
    const next: boolean;
    const searchBarRef = React.createRef<SearchBar>();
    const selectedScroll = React.createRef<ScrollView>();

    // Constructor
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

    // Callbacks
    const componentDidMount() {
        this.navigationEventListener = Navigation.events().bindComponent(this);
        const { dataSource } = this.props;
        if (dataSource === ViewTypes.DATA_SOURCE_USERS) {
            this.getProfiles();
        } else if (dataSource === ViewTypes.DATA_SOURCE_CHANNELS) {
            this.getChannels();
        } else if (dataSource === ViewTypes.DATA_SOURCE_DYNAMIC) {
            this.getDynamicOptions();
        }
    }

    const clearSearch = () => {
        this.setState({ term: '', searchResults: [] });
    };

    const close = () => {
        popTopScreen();
    };

    const handleSelectItem = (id: string, item: UserProfile | Channel | DialogOption) => {
        if (!this.props.isMultiselect) {
            this.props.onSelect(item);
            this.close();
            return;
        }

        switch (this.props.dataSource) {
            case ViewTypes.DATA_SOURCE_USERS: {
                const currentSelected = this.state.multiselectSelected as Dictionary<UserProfile>;
                const typedItem = item as UserProfile;
                const multiselectSelected = { ...currentSelected };
                if (currentSelected[typedItem.id]) {
                    delete multiselectSelected[typedItem.id];
                } else {
                    multiselectSelected[typedItem.id] = typedItem;
                }
                this.setState({ multiselectSelected });
                break;
            }
            case ViewTypes.DATA_SOURCE_CHANNELS: {
                const currentSelected = this.state.multiselectSelected as Dictionary<Channel>;
                const typedItem = item as Channel;
                const multiselectSelected = { ...currentSelected };
                if (currentSelected[typedItem.id]) {
                    delete multiselectSelected[typedItem.id];
                } else {
                    multiselectSelected[typedItem.id] = typedItem;
                }
                this.setState({ multiselectSelected });
                break;
            }
            default: {
                const currentSelected = this.state.multiselectSelected as Dictionary<DialogOption>;
                const typedItem = item as DialogOption;
                const multiselectSelected = { ...currentSelected };
                if (currentSelected[typedItem.value]) {
                    delete multiselectSelected[typedItem.value];
                } else {
                    multiselectSelected[typedItem.value] = typedItem;
                }
                this.setState({ multiselectSelected });
            }
        }

        setTimeout(() => {
            if (this.selectedScroll.current) {
                this.selectedScroll.current.scrollToEnd();
            }
        });
    };

    const navigationButtonPressed({ buttonId }: { buttonId: string }) {
        switch (buttonId) {
            case 'submit-form':
                this.props.onSelect(Object.values(this.state.multiselectSelected));
                this.close();
                return;
            case 'close-dialog':
                this.close();
        }
    }

    const handleRemoveOption = (item: UserProfile | Channel | DialogOption) => {
        switch (this.props.dataSource) {
            case ViewTypes.DATA_SOURCE_USERS: {
                const currentSelected = this.state.multiselectSelected as Dictionary<UserProfile>;
                const typedItem = item as UserProfile;
                const multiselectSelected = { ...currentSelected };
                delete multiselectSelected[typedItem.id];
                this.setState({ multiselectSelected });
                return;
            }
            case ViewTypes.DATA_SOURCE_CHANNELS: {
                const currentSelected = this.state.multiselectSelected as Dictionary<Channel>;
                const typedItem = item as Channel;
                const multiselectSelected = { ...currentSelected };
                delete multiselectSelected[typedItem.id];
                this.setState({ multiselectSelected });
                return;
            }
            default: {
                const currentSelected = this.state.multiselectSelected as Dictionary<DialogOption>;
                const typedItem = item as DialogOption;
                const multiselectSelected = { ...currentSelected };
                delete multiselectSelected[typedItem.value];
                this.setState({ multiselectSelected });
            }
        }
    };

    const getChannels = debounce(() => {
        const { actions, currentTeamId } = this.props;
        const { loading, term } = this.state;
        if (this.next && !loading && !term) {
            this.setState({ loading: true }, () => {
                actions.getChannels(
                    currentTeamId,
                    this.page += 1,
                    General.CHANNELS_CHUNK_SIZE,
                ).then(this.loadedChannels);
            });
        }
    }, 100);

    const getDataResults = () => {
        const { dataSource } = this.props;
        const { data, searchResults, term } = this.state;

        const result = {
            data: data as any,
            listType: FLATLIST
        };
        if (term) {
            result.data = filterSearchData(dataSource, searchResults, term);
        } else if (dataSource === ViewTypes.DATA_SOURCE_USERS) {
            result.data = createProfilesSections(data);
            result.listType = SECTIONLIST;
        }

        if (!dataSource || dataSource === ViewTypes.DATA_SOURCE_DYNAMIC) {
            result.data = result.data.map((value: DialogOption) => {
                return { ...value, id: (value).value };
            });
        }

        return result;
    };

    const getProfiles = debounce(() => {
        const { loading, term } = this.state;
        if (this.next && !loading && !term) {
            this.setState({ loading: true }, () => {
                const { actions } = this.props;

                actions.getProfiles(
                    this.page + 1,
                    General.PROFILE_CHUNK_SIZE,
                ).then(this.loadedProfiles);
            });
        }
    }, 100);

    const getDynamicOptions = debounce(() => {
        const { loading, term } = this.state;
        if (this.next && !loading && !term) {
            this.searchDynamicOptions('');
        }
    }, 100);

    const loadedChannels = ({ data: channels }: { data: Channel[] }) => {
        const data = this.state.data as Channel[];
        if (channels && !channels.length) {
            this.next = false;
        }

        this.page += 1;
        this.setState({ loading: false, data: [...channels, ...data] });
    };

    const loadedProfiles = ({ data: profiles }: { data: UserProfile[] }) => {
        const data = this.state.data as UserProfile[];
        if (profiles && !profiles.length) {
            this.next = false;
        }

        this.page += 1;
        this.setState({ loading: false, data: [...profiles, ...data] });
    };

    const loadMore = () => {
        const { dataSource } = this.props;

        if (dataSource === ViewTypes.DATA_SOURCE_USERS) {
            this.getProfiles();
        } else if (dataSource === ViewTypes.DATA_SOURCE_CHANNELS) {
            this.getChannels();
        }

        // dynamic options are not paged so are not reloaded on scroll
    };

    const onSearch = (text: string) => {
        if (text) {
            const { dataSource, data } = this.props;
            this.setState({ term: text });
            clearTimeout(this.searchTimeoutId);

            this.searchTimeoutId = setTimeout(() => {
                if (!dataSource) {
                    this.setState({ searchResults: filterSearchData(null, data, text) });
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

    const searchChannels = (term: string) => {
        const { actions, currentTeamId } = this.props;

        actions.searchChannels(currentTeamId, term.toLowerCase()).then(({ data }) => {
            this.setState({ searchResults: data, loading: false });
        });
    };

    const searchProfiles = (term: string) => {
        const { actions } = this.props;
        this.setState({ loading: true });

        actions.searchProfiles(term.toLowerCase()).then((results) => {
            let data = [];
            if (results.data) {
                data = results.data;
            }
            this.setState({ searchResults: data, loading: false });
        });
    };

    const searchDynamicOptions = (term = '') => {
        if (!this.props.getDynamicOptions) {
            return;
        }

        this.setState({ loading: true });

        this.props.getDynamicOptions(term.toLowerCase()).then((results) => {
            let data = [];
            if (results.data) {
                data = results.data;
            }

            if (term) {
                this.setState({ searchResults: data, loading: false });
            } else {
                this.setState({ data, loading: false });
            }
        });
    };

    const renderLoading = () => {
        const { dataSource, theme } = this.props;
        const { loading } = this.state;
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

    const renderNoResults = () => {
        const { loading } = this.state;
        const { theme } = this.props;
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

    const renderChannelItem = (props: any) => {
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

    const renderOptionItem = (props: any) => {
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

    const renderUserItem = (props: any) => {
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

    const { theme, dataSource } = this.props;
    const { loading, term } = this.state;
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

    const { data, listType } = this.getDataResults();

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
                <View style={style.separator} />
            </>
        );
    }

    return (
        <SafeAreaView style={style.container}>
            <View
                testID='integration_selector.screen'
                style={style.searchBar}
            >
                <SearchBar
                    testID='selector.search_bar'
                    ref={this.searchBarRef}
                    placeholder={intl.formatMessage({ id: 'search_bar.search', defaultMessage: 'Search' })}
                    cancelTitle={intl.formatMessage({ id: 'mobile.post.cancel', defaultMessage: 'Cancel' })}
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

export default IntegrationSelector;
