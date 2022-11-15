// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {fetchChannels, searchChannels as searchChannelsRemote} from '@actions/remote/channel';
import {fetchProfiles, searchProfiles as searchProfilesRemote} from '@actions/remote/user';
import FormattedText from '@components/formatted_text';
import SearchBar from '@components/search';
import {General, View as ViewConstants} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {debounce} from '@helpers/api/general';
import useNavButtonPressed from '@hooks/navigation_button_pressed';
import {observeCurrentTeamId} from '@queries/servers/system';
import {
    buildNavigationButton,
    popTopScreen, setButtons,
} from '@screens/navigation';
import {filterChannelsMatchingTerm} from '@utils/channel';
import {changeOpacity, getKeyboardAppearanceFromTheme, makeStyleSheetFromTheme} from '@utils/theme';
import {filterProfilesMatchingTerm} from '@utils/user';

import {createProfilesSections} from '../create_direct_message/user_list';

import ChannelListRow from './channel_list_row';
import CustomList, {FLATLIST, SECTIONLIST} from './custom_list';
import OptionListRow from './option_list_row';
import SelectedOptions from './selected_options';
import UserListRow from './user_list_row';

import type {WithDatabaseArgs} from '@typings/database/database';

type DataType = DialogOption[] | Channel[] | UserProfile[];
type Selection = DialogOption | Channel | UserProfile | DialogOption[] | Channel[] | UserProfile[];
type MultiselectSelectedMap = Dictionary<DialogOption> | Dictionary<Channel> | Dictionary<UserProfile>;
type UserProfileSection = {
    id: string;
    data: UserProfile[];
};

const VALID_DATASOURCES = [
    ViewConstants.DATA_SOURCE_CHANNELS,
    ViewConstants.DATA_SOURCE_USERS,
    ViewConstants.DATA_SOURCE_DYNAMIC];
const INITIAL_PAGE = 0;
const SUBMIT_BUTTON_ID = 'submit-integration-selector-multiselect';

const close = () => {
    popTopScreen();
};

export type Props = {
    getDynamicOptions?: (userInput?: string) => Promise<DialogOption[]>;
    options?: PostActionOption[];
    currentTeamId: string;
    data?: DataType;
    dataSource: string;
    handleSelect: (opt: Selection) => void;
    isMultiselect?: boolean;
    selected?: DialogOption[];
    theme: Theme;
    teammateNameDisplay: string;
    componentId: string;
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

function IntegrationSelector(
    {dataSource, data, isMultiselect, selected, handleSelect,
        currentTeamId, componentId, getDynamicOptions, options, teammateNameDisplay}: Props) {
    const serverUrl = useServerUrl();
    const theme = useTheme();
    const searchTimeoutId = useRef<NodeJS.Timeout | null>(null);
    const style = getStyleSheet(theme);
    const searchBarInput = {
        backgroundColor: changeOpacity(theme.centerChannelColor, 0.2),
        color: theme.centerChannelColor,
        fontSize: 15,
    };
    const intl = useIntl();

    // HOOKS
    const [integrationData, setIntegrationData] = useState<DataType>(data || []);
    const [loading, setLoading] = useState<boolean>(false);
    const [term, setTerm] = useState<string>('');
    const [searchResults, setSearchResults] = useState<DataType>([]);
    const [multiselectSelected, setMultiselectSelected] = useState<MultiselectSelectedMap>({});
    const [currentPage, setCurrentPage] = useState<number>(INITIAL_PAGE);
    const [next, setNext] = useState<boolean>(VALID_DATASOURCES.includes(dataSource));
    const [customListData, setCustomListData] = useState<DataType | UserProfileSection[]>([]);

    // Callbacks
    const clearSearch = useCallback(() => {
        setTerm('');
        setSearchResults([]);
    }, []);

    // This is the button to submit multiselect options
    const rightButton = useMemo(() => {
        const base = buildNavigationButton(
            SUBMIT_BUTTON_ID,
            'integration_selector.multiselect.submit.button',
            undefined,
            intl.formatMessage({id: 'integration_selector.multiselect.submit', defaultMessage: 'Done'}),
        );
        base.enabled = true;
        base.showAsAction = 'always';
        base.color = theme.sidebarHeaderTextColor;
        return base;
    }, [theme.sidebarHeaderTextColor, intl]);

    const handleSelectItem = useCallback((item: Selection) => {
        if (!isMultiselect) {
            handleSelect(item);
            close();
            return;
        }

        switch (dataSource) {
            case ViewConstants.DATA_SOURCE_USERS: {
                const currentSelected = multiselectSelected as Dictionary<UserProfile>;
                const typedItem = item as UserProfile;
                const multiselectSelectedItems = {...currentSelected};

                if (currentSelected[typedItem.id]) {
                    delete multiselectSelectedItems[typedItem.id];
                } else {
                    multiselectSelectedItems[typedItem.id] = typedItem;
                }

                setMultiselectSelected(multiselectSelectedItems);
                return;
            }
            case ViewConstants.DATA_SOURCE_CHANNELS: {
                const currentSelected = multiselectSelected as Dictionary<Channel>;
                const typedItem = item as Channel;
                const multiselectSelectedItems = {...currentSelected};
                if (currentSelected[typedItem.id]) {
                    delete multiselectSelectedItems[typedItem.id];
                } else {
                    multiselectSelectedItems[typedItem.id] = typedItem;
                }

                setMultiselectSelected(multiselectSelectedItems);
                return;
            }
            default: {
                const currentSelected = multiselectSelected as Dictionary<DialogOption>;
                const typedItem = item as DialogOption;
                const multiselectSelectedItems = {...currentSelected};
                if (currentSelected[typedItem.value]) {
                    delete multiselectSelectedItems[typedItem.value];
                } else {
                    multiselectSelectedItems[typedItem.value] = typedItem;
                }
                setMultiselectSelected(multiselectSelectedItems);
            }
        }
    }, [integrationData, multiselectSelected, isMultiselect, dataSource, handleSelect]);

    const handleRemoveOption = (item: UserProfile | Channel | DialogOption) => {
        switch (dataSource) {
            case ViewConstants.DATA_SOURCE_USERS: {
                const currentSelected = multiselectSelected as Dictionary<UserProfile>;
                const typedItem = item as UserProfile;
                const multiselectSelectedItems = {...currentSelected};
                delete multiselectSelectedItems[typedItem.id];
                setMultiselectSelected(multiselectSelectedItems);
                return;
            }
            case ViewConstants.DATA_SOURCE_CHANNELS: {
                const currentSelected = multiselectSelected as Dictionary<Channel>;
                const typedItem = item as Channel;
                const multiselectSelectedItems = {...currentSelected};
                delete multiselectSelectedItems[typedItem.id];
                setMultiselectSelected(multiselectSelectedItems);
                return;
            }
            default: {
                const currentSelected = multiselectSelected as Dictionary<DialogOption>;
                const typedItem = item as DialogOption;
                const multiselectSelectedItems = {...currentSelected};
                delete multiselectSelectedItems[typedItem.value];
                setMultiselectSelected(multiselectSelectedItems);
            }
        }
    };

    const getChannels = useCallback(debounce(async () => {
        if (next && !loading && !term) {
            setLoading(true);
            setCurrentPage(currentPage + 1);

            const {channels: channelData} = await fetchChannels(serverUrl, currentTeamId, currentPage);

            setLoading(false);

            if (channelData && channelData.length > 0) {
                if (channelData && !channelData.length) {
                    setNext(false);
                }

                setIntegrationData(channelData);
            }
        }
    }, 100), [integrationData, next, currentPage, loading, term]);

    const getProfiles = useCallback(debounce(async () => {
        if (next && !loading && !term) {
            setLoading(true);
            setCurrentPage(currentPage + 1);

            const {users: profiles} = await fetchProfiles(serverUrl, currentPage);

            setLoading(false);

            if (profiles && profiles.length > 0) {
                if (profiles && !profiles.length) {
                    setNext(false);
                }

                setIntegrationData(profiles);
            }
        }
    }, 100), [integrationData, next, currentPage, loading, term]);

    const loadMore = async () => {
        if (dataSource === ViewConstants.DATA_SOURCE_USERS) {
            await getProfiles();
        } else if (dataSource === ViewConstants.DATA_SOURCE_CHANNELS) {
            await getChannels();
        }

        // dynamic options are not paged so are not reloaded on scroll
    };

    const searchChannels = async (searchTerm: string) => {
        const isSearch = true;
        const {channels: receivedChannels} = await searchChannelsRemote(serverUrl, searchTerm, currentTeamId, isSearch);

        if (receivedChannels) {
            setSearchResults(receivedChannels);
        }
    };

    const searchProfiles = async (searchTerm: string) => {
        const {data: userData} = await searchProfilesRemote(serverUrl, searchTerm.toLowerCase(), {team_id: currentTeamId, allow_inactive: true});

        if (userData) {
            setSearchResults(userData);
        }
    };

    const searchDynamicOptions = useCallback((searchTerm = '') => {
        if (options) {
            setIntegrationData(options);
        }

        if (!getDynamicOptions) {
            return;
        }

        getDynamicOptions(searchTerm.toLowerCase()).then((results: DialogOption[]) => {
            const searchData = results || [];

            if (searchTerm) {
                setSearchResults(searchData);
            } else {
                setIntegrationData(searchData);
            }
        });
    }, [options, getDynamicOptions]);

    const onHandleMultiselectSubmit = () => {
        handleSelectItem(getMultiselectData());
        close();
    };

    const onSearch = useCallback((text: string) => {
        if (!text) {
            clearSearch();
        }

        setTerm(text);

        if (searchTimeoutId.current) {
            clearTimeout(searchTimeoutId.current);
        }

        searchTimeoutId.current = setTimeout(async () => {
            if (!dataSource) {
                setSearchResults(filterSearchData('', integrationData, text));
                return;
            }

            setLoading(true);

            if (dataSource === ViewConstants.DATA_SOURCE_USERS) {
                await searchProfiles(text);
            } else if (dataSource === ViewConstants.DATA_SOURCE_CHANNELS) {
                await searchChannels(text);
            } else if (dataSource === ViewConstants.DATA_SOURCE_DYNAMIC) {
                await searchDynamicOptions(text);
            }

            setLoading(false);
        }, General.SEARCH_TIMEOUT_MILLISECONDS);
    }, [dataSource, term]);

    const filterSearchData = (source: string, searchData: DataType, searchTerm: string) => {
        if (!data) {
            return [];
        }

        const lowerCasedTerm = searchTerm.toLowerCase();

        if (source === ViewConstants.DATA_SOURCE_USERS) {
            return filterProfilesMatchingTerm(searchData as UserProfile[], lowerCasedTerm);
        } else if (source === ViewConstants.DATA_SOURCE_CHANNELS) {
            return filterChannelsMatchingTerm(searchData as Channel[], lowerCasedTerm);
        } else if (source === ViewConstants.DATA_SOURCE_DYNAMIC) {
            return searchData;
        }

        return (searchData as DialogOption[]).filter((option) => option.text && option.text.toLowerCase().startsWith(lowerCasedTerm));
    };

    const getMultiselectData = useCallback((): Selection => {
        let myItems;
        let multiselectItems: Selection = [];

        switch (dataSource) {
            case ViewConstants.DATA_SOURCE_USERS:
                myItems = multiselectSelected as Dictionary<UserProfile>;
                multiselectItems = multiselectItems as UserProfile[];
                // eslint-disable-next-line guard-for-in
                for (const index in myItems) {
                    multiselectItems.push(myItems[index]);
                }
                return multiselectItems;
            case ViewConstants.DATA_SOURCE_CHANNELS:
                myItems = multiselectSelected as Dictionary<Channel>;
                multiselectItems = multiselectItems as Channel[];
                // eslint-disable-next-line guard-for-in
                for (const index in myItems) {
                    multiselectItems.push(myItems[index]);
                }
                return multiselectItems;
            default:
                myItems = multiselectSelected as Dictionary<DialogOption>;
                multiselectItems = multiselectItems as DialogOption[];
                // eslint-disable-next-line guard-for-in
                for (const index in myItems) {
                    multiselectItems.push(myItems[index]);
                }
                return multiselectItems;
        }
    }, [multiselectSelected, dataSource]);

    // Effects
    useNavButtonPressed(SUBMIT_BUTTON_ID, componentId, onHandleMultiselectSubmit, [onHandleMultiselectSubmit, multiselectSelected]);

    useEffect(() => {
        if (dataSource === ViewConstants.DATA_SOURCE_USERS) {
            getProfiles();
        } else if (dataSource === ViewConstants.DATA_SOURCE_CHANNELS) {
            getChannels();
        } else if (!loading && !term) {
            searchDynamicOptions('');
        }
    }, []);

    useEffect(() => {
        let listData: (DataType | UserProfileSection[]) = integrationData;
        if (term) {
            listData = searchResults;
        }

        if (dataSource === ViewConstants.DATA_SOURCE_USERS) {
            listData = createProfilesSections(listData as UserProfile[]);
        }

        if (!dataSource || dataSource === ViewConstants.DATA_SOURCE_DYNAMIC) {
            listData = (integrationData as DialogOption[]).filter((option) => option.text && option.text.toLowerCase().includes(term));
        }

        setCustomListData(listData);
    }, [searchResults, integrationData]);

    useEffect(() => {
        if (!isMultiselect) {
            return;
        }

        setButtons(componentId, {
            rightButtons: [rightButton],
        });
    }, [rightButton, componentId, isMultiselect]);

    useEffect(() => {
        const multiselectItems: MultiselectSelectedMap = {};

        if (isMultiselect && selected && !([ViewConstants.DATA_SOURCE_USERS, ViewConstants.DATA_SOURCE_CHANNELS].includes(dataSource))) {
            selected.forEach((opt) => {
                multiselectItems[opt.value] = opt;
            });

            setMultiselectSelected(multiselectItems);
        }
    }, [multiselectSelected]);

    // Renders
    const renderLoading = (): React.ReactElement<any, string> | null => {
        if (!loading) {
            return null;
        }

        let text;
        switch (dataSource) {
            case ViewConstants.DATA_SOURCE_USERS:
                text = {
                    id: intl.formatMessage({id: 'mobile.integration_selector.loading_users'}),
                    defaultMessage: 'Loading Channels...',
                };
                break;
            case ViewConstants.DATA_SOURCE_CHANNELS:
                text = {
                    id: intl.formatMessage({id: 'mobile.integration_selector.loading_channels'}),
                    defaultMessage: 'Loading Channels...',
                };
                break;
            default:
                text = {
                    id: intl.formatMessage({id: 'mobile.integration_selector.loading_options'}),
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

    const renderNoResults = (): JSX.Element | null => {
        if (loading || currentPage === INITIAL_PAGE) {
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

    const renderChannelItem = (itemProps: any) => {
        const itemSelected = Boolean(multiselectSelected[itemProps.item.id]);
        return (
            <ChannelListRow
                key={itemProps.id}
                {...itemProps}

                theme={theme}
                channel={itemProps.item as Channel}
                selectable={isMultiselect || false}
                selected={itemSelected}
            />
        );
    };

    const renderOptionItem = (itemProps: any) => {
        const itemSelected = Boolean(multiselectSelected[itemProps.item.value]);
        return (
            <OptionListRow
                key={itemProps.id}
                {...itemProps}
                theme={theme}
                selectable={isMultiselect || false}
                selected={itemSelected}
            />
        );
    };

    const renderUserItem = (itemProps: any): JSX.Element => {
        const itemSelected = Boolean(multiselectSelected[itemProps.item.id]);

        return (
            <UserListRow
                key={itemProps.id}
                {...itemProps}
                theme={theme}
                selectable={isMultiselect || false}
                user={itemProps.item}
                teammateNameDisplay={teammateNameDisplay}
                selected={itemSelected}
            />
        );
    };

    const renderSelectedOptions = (): React.ReactElement<any, string> | null => {
        const selectedItems: any = Object.values(multiselectSelected);

        let optionComponents: React.ReactElement<any, string> | null = null;

        if (selectedItems.length > 0) {
            optionComponents = (
                <>
                    <SelectedOptions
                        theme={theme}
                        selectedOptions={selectedItems}
                        dataSource={dataSource}
                        onRemove={handleRemoveOption}
                    />
                    <View style={style.separator}/>
                </>
            );
        }

        return optionComponents;
    };

    const listType = dataSource === ViewConstants.DATA_SOURCE_USERS ? SECTIONLIST : FLATLIST;
    let rowComponent;
    if (dataSource === ViewConstants.DATA_SOURCE_USERS) {
        rowComponent = renderUserItem;
    } else if (dataSource === ViewConstants.DATA_SOURCE_CHANNELS) {
        rowComponent = renderChannelItem;
    } else {
        rowComponent = renderOptionItem;
    }

    const selectedOptionsComponent = renderSelectedOptions();

    return (
        <SafeAreaView style={style.container}>
            <View
                testID='integration_selector.screen'
                style={style.searchBar}
            >
                <SearchBar
                    testID='selector.search_bar'
                    placeholder={intl.formatMessage({id: 'search_bar.search', defaultMessage: 'Search'})}
                    inputStyle={searchBarInput}
                    placeholderTextColor={changeOpacity(theme.centerChannelColor, 0.5)}
                    onChangeText={onSearch}
                    autoCapitalize='none'
                    keyboardAppearance={getKeyboardAppearanceFromTheme(theme)}
                    value={term}
                />
            </View>

            {selectedOptionsComponent}

            <CustomList
                data={customListData as DataType}
                key='custom_list'
                listType={listType}
                loading={loading}
                loadingComponent={renderLoading()}
                noResults={renderNoResults}
                onLoadMore={loadMore}
                onRowPress={handleSelectItem}
                renderItem={rowComponent}
                theme={theme}
            />
        </SafeAreaView>
    );
}

const withTeamId = withObservables([], ({database}: WithDatabaseArgs) => ({
    currentTeamId: observeCurrentTeamId(database),
}));

export default withDatabase(withTeamId(IntegrationSelector));
