// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {fetchChannels, searchChannels} from '@actions/remote/channel';
import {fetchProfiles, searchProfiles} from '@actions/remote/user';
import FormattedText from '@components/formatted_text';
import SearchBar from '@components/search';
import ServerUserList from '@components/server_user_list';
import {General, Screens, View as ViewConstants} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {debounce} from '@helpers/api/general';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import useNavButtonPressed from '@hooks/navigation_button_pressed';
import {t} from '@i18n';
import SecurityManager from '@managers/security_manager';
import {
    buildNavigationButton,
    popTopScreen, setButtons,
} from '@screens/navigation';
import {filterChannelsMatchingTerm} from '@utils/channel';
import {filterOptions} from '@utils/message_attachment';
import {changeOpacity, getKeyboardAppearanceFromTheme, makeStyleSheetFromTheme} from '@utils/theme';
import {secureGetFromRecord} from '@utils/types';
import {typography} from '@utils/typography';

import ChannelListRow from './channel_list_row';
import CustomList from './custom_list';
import OptionListRow from './option_list_row';
import SelectedOptions from './selected_options';

import type {AvailableScreens} from '@typings/screens/navigation';

type DataType = DialogOption | Channel | UserProfile;
type DataTypeList = DialogOption[] | Channel[] | UserProfile[];
type Selection = DataType | DataTypeList;
type MultiselectSelectedMap = Dictionary<DialogOption> | Dictionary<Channel> | Dictionary<UserProfile>;

const VALID_DATASOURCES = [
    ViewConstants.DATA_SOURCE_CHANNELS,
    ViewConstants.DATA_SOURCE_USERS,
    ViewConstants.DATA_SOURCE_DYNAMIC];
const SUBMIT_BUTTON_ID = 'submit-integration-selector-multiselect';

const close = () => {
    popTopScreen();
};

const extractItemKey = (dataSource: string, item: DataType): string => {
    switch (dataSource) {
        case ViewConstants.DATA_SOURCE_USERS: {
            const typedItem = item as UserProfile;
            return typedItem.id;
        }
        case ViewConstants.DATA_SOURCE_CHANNELS: {
            const typedItem = item as Channel;
            return typedItem.id;
        }
        default: {
            const typedItem = item as DialogOption;
            return typedItem.value;
        }
    }
};

const toggleFromMap = <T extends DialogOption | Channel | UserProfile>(current: MultiselectSelectedMap, key: string, item: T): MultiselectSelectedMap => {
    const newMap = {...current};

    const hasValue = Boolean(secureGetFromRecord<any>(current, key));
    if (hasValue) {
        delete newMap[key];
    } else {
        newMap[key] = item;
    }

    return newMap;
};

const filterSearchData = (source: string, searchData: DataTypeList, searchTerm: string) => {
    if (!searchData) {
        return [];
    }

    const lowerCasedTerm = searchTerm.toLowerCase();

    if (source === ViewConstants.DATA_SOURCE_CHANNELS) {
        return filterChannelsMatchingTerm(searchData as Channel[], lowerCasedTerm);
    } else if (source === ViewConstants.DATA_SOURCE_DYNAMIC) {
        return searchData;
    }

    return (searchData as DialogOption[]).filter((option) => option.text && option.text.includes(lowerCasedTerm));
};

const handleIdSelection = (dataSource: string, currentIds: {[id: string]: DataType}, item: DataType) => {
    const newSelectedIds = {...currentIds};
    const key = extractItemKey(dataSource, item);
    const wasSelected = secureGetFromRecord(currentIds, key);

    if (wasSelected) {
        Reflect.deleteProperty(newSelectedIds, key);
    } else {
        newSelectedIds[key] = item;
    }

    return newSelectedIds;
};

export type Props = {
    getDynamicOptions?: (userInput?: string) => Promise<DialogOption[]>;
    options?: PostActionOption[];
    currentTeamId: string;
    currentUserId: string;
    data?: DataTypeList;
    dataSource: string;
    handleSelect: (opt: Selection) => void;
    isMultiselect?: boolean;
    selected: SelectedDialogValue;
    theme: Theme;
    componentId: AvailableScreens;
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
            color: changeOpacity(theme.centerChannelColor, 0.5),
            ...typography('Body', 600, 'Regular'),
        },
        searchBarInput: {
            color: theme.centerChannelColor,
            ...typography('Body', 200, 'Regular'),
        },
        separator: {
            height: 1,
            flex: 0,
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.1),
        },
    };
});

function IntegrationSelector(
    {dataSource, data, isMultiselect = false, selected, handleSelect,
        currentTeamId, currentUserId, componentId, getDynamicOptions, options}: Props) {
    const serverUrl = useServerUrl();
    const theme = useTheme();
    const searchTimeoutId = useRef<NodeJS.Timeout | null>(null);
    const style = getStyleSheet(theme);
    const intl = useIntl();

    // HOOKS
    const [integrationData, setIntegrationData] = useState<DataTypeList>(data || []);
    const [loading, setLoading] = useState<boolean>(false);
    const [term, setTerm] = useState<string>('');
    const [searchResults, setSearchResults] = useState<DataTypeList>([]);

    // Channels and DialogOptions, will be removed
    const [multiselectSelected, setMultiselectSelected] = useState<MultiselectSelectedMap>({});

    // Users selection and in the future Channels and DialogOptions
    const [selectedIds, setSelectedIds] = useState<{[id: string]: DataType}>({});
    const [customListData, setCustomListData] = useState<DataTypeList>([]);

    const page = useRef<number>(-1);
    const next = useRef<boolean>(VALID_DATASOURCES.includes(dataSource));

    const filteredOptions = useMemo(() => {
        return filterOptions(options) || [];
    }, [options]);

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
            case ViewConstants.DATA_SOURCE_CHANNELS: {
                const itemKey = extractItemKey(dataSource, item as Channel);
                setMultiselectSelected((current) => toggleFromMap(current, itemKey, item as Channel));
                return;
            }
            default: {
                const itemKey = extractItemKey(dataSource, item as DialogOption);
                setMultiselectSelected((current) => toggleFromMap(current, itemKey, item as DialogOption));
            }
        }
    }, [isMultiselect, dataSource, handleSelect]);

    const handleRemoveOption = useCallback((item: Channel | DialogOption | UserProfile) => {
        const itemKey = extractItemKey(dataSource, item);

        if (dataSource === ViewConstants.DATA_SOURCE_USERS) {
            setSelectedIds((current) => {
                const selectedIdItems = {...current};
                delete selectedIdItems[itemKey];
                return selectedIdItems;
            });
        } else {
            setMultiselectSelected((current) => {
                const multiselectSelectedItems = {...current};
                if (secureGetFromRecord<any>(multiselectSelectedItems, itemKey) !== undefined) {
                    delete multiselectSelectedItems[itemKey];
                }
                return multiselectSelectedItems;
            });
        }
    }, [dataSource]);

    const getChannels = useCallback(debounce(async () => {
        if (next.current && !loading && !term) {
            setLoading(true);
            page.current += 1;

            const {channels: channelData} = await fetchChannels(serverUrl, currentTeamId, page.current);

            setLoading(false);

            if (channelData && channelData.length > 0) {
                setIntegrationData([...integrationData as Channel[], ...channelData]);
            } else {
                next.current = false;
            }
        }
    }, 100), [loading, term, serverUrl, currentTeamId, integrationData]);

    const loadMore = useCallback(async () => {
        if (dataSource === ViewConstants.DATA_SOURCE_CHANNELS) {
            await getChannels();
        }

        // dynamic options are not paged so are not reloaded on scroll
    }, [getChannels, dataSource]);

    const searchDynamicOptions = useCallback(async (searchTerm = '') => {
        if (filteredOptions && filteredOptions !== integrationData && !searchTerm) {
            setIntegrationData(filteredOptions);
        }

        if (!getDynamicOptions) {
            return;
        }

        const results: DialogOption[] = await getDynamicOptions(searchTerm.toLowerCase());
        const searchData = results || [];

        if (searchTerm) {
            setSearchResults(searchData);
        } else {
            setIntegrationData(searchData);
        }
    }, [filteredOptions, getDynamicOptions, integrationData]);

    const handleSelectProfile = useCallback((user: UserProfile): void => {
        if (!isMultiselect) {
            handleSelect(user);
            close();
        }

        setSelectedIds((current) => handleIdSelection(dataSource, current, user));
    }, [isMultiselect, handleSelect, dataSource]);

    const onHandleMultiselectSubmit = useCallback(() => {
        if (dataSource === ViewConstants.DATA_SOURCE_USERS) {
            // New multiselect
            handleSelect(Object.values(selectedIds) as UserProfile[]);
        } else {
            // Legacy multiselect
            handleSelect(Object.values(multiselectSelected));
        }
        close();
    }, [dataSource, handleSelect, selectedIds, multiselectSelected]);

    const onSearch = useCallback((text: string) => {
        if (!text) {
            clearSearch();
            return;
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

            if (dataSource === ViewConstants.DATA_SOURCE_CHANNELS) {
                const isSearch = true;
                const {channels: receivedChannels} = await searchChannels(
                    serverUrl, text, currentTeamId, isSearch);

                if (receivedChannels) {
                    setSearchResults(receivedChannels);
                }
            } else if (dataSource === ViewConstants.DATA_SOURCE_DYNAMIC) {
                await searchDynamicOptions(text);
            }

            setLoading(false);
        }, General.SEARCH_TIMEOUT_MILLISECONDS);
    }, [clearSearch, dataSource, integrationData, serverUrl, currentTeamId, searchDynamicOptions]);

    // Effects
    useNavButtonPressed(SUBMIT_BUTTON_ID, componentId, onHandleMultiselectSubmit, [onHandleMultiselectSubmit]);
    useAndroidHardwareBackHandler(componentId, close);

    useEffect(() => {
        return () => {
            if (searchTimeoutId.current) {
                clearTimeout(searchTimeoutId.current);
                searchTimeoutId.current = null;
            }
        };
    }, []);

    useEffect(() => {
        if (dataSource === ViewConstants.DATA_SOURCE_CHANNELS) {
            getChannels();
        } else {
            // Static and dynamic option search
            searchDynamicOptions('');
        }
    }, []);

    useEffect(() => {
        let listData: DataTypeList = integrationData;

        if (term) {
            listData = searchResults;
        }

        if (dataSource === ViewConstants.DATA_SOURCE_DYNAMIC) {
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

        if (isMultiselect && Array.isArray(selected) && !([ViewConstants.DATA_SOURCE_USERS, ViewConstants.DATA_SOURCE_CHANNELS].includes(dataSource))) {
            for (const value of selected) {
                const option = filteredOptions?.find((opt) => opt.value === value);
                if (option) {
                    multiselectItems[value] = option;
                }
            }

            setMultiselectSelected(multiselectItems);
        }
    }, []);

    // Renders
    const renderLoading = useCallback(() => {
        if (!loading) {
            return null;
        }

        let text;
        switch (dataSource) {
            case ViewConstants.DATA_SOURCE_CHANNELS:
                text = {
                    id: t('mobile.integration_selector.loading_channels'),
                    defaultMessage: 'Loading Channels...',
                };
                break;
            default:
                text = {
                    id: t('mobile.integration_selector.loading_options'),
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
    }, [style, dataSource, loading]);

    const renderNoResults = useCallback((): JSX.Element | null => {
        if (loading || page.current === -1) {
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
    }, [loading, style]);

    const renderChannelItem = useCallback((itemProps: any) => {
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
    }, [multiselectSelected, theme, isMultiselect]);

    const renderOptionItem = useCallback((itemProps: any) => {
        const itemSelected = Boolean(secureGetFromRecord<any>(multiselectSelected, itemProps.item.value));
        return (
            <OptionListRow
                key={itemProps.id}
                {...itemProps}
                theme={theme}
                selectable={isMultiselect}
                selected={itemSelected}
            />
        );
    }, [multiselectSelected, theme, isMultiselect]);

    const getRenderItem = (): (itemProps: any) => JSX.Element => {
        switch (dataSource) {
            case ViewConstants.DATA_SOURCE_CHANNELS:
                return renderChannelItem;
            default:
                return renderOptionItem;
        }
    };

    const renderSelectedOptions = useCallback((): React.ReactElement<string> | null => {
        let selectedItems: Channel[] | DialogOption[] | UserProfile[] = Object.values(multiselectSelected);

        if (dataSource === ViewConstants.DATA_SOURCE_USERS) {
            // New multiselect
            selectedItems = Object.values(selectedIds) as UserProfile[];
        }

        if (!selectedItems.length) {
            return null;
        }

        return (
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
    }, [dataSource, handleRemoveOption, multiselectSelected, selectedIds, style.separator, theme]);

    const userFetchFunction = useCallback(async (userFetchPage: number) => {
        const result = await fetchProfiles(serverUrl, userFetchPage, General.PROFILE_CHUNK_SIZE);
        if (result.users?.length) {
            return result.users;
        }

        return [];
    }, [serverUrl]);

    const userSearchFunction = useCallback(async (searchTerm: string) => {
        const lowerCasedTerm = searchTerm.toLowerCase();
        const results = await searchProfiles(serverUrl, lowerCasedTerm, {allow_inactive: false});

        if (results.data) {
            return results.data;
        }

        return [];
    }, [serverUrl]);

    const createUserFilter = useCallback((exactMatches: UserProfile[], searchTerm: string) => {
        return (p: UserProfile) => {
            if (p.username === searchTerm || p.username.startsWith(searchTerm)) {
                exactMatches.push(p);
                return false;
            }

            return true;
        };
    }, []);

    const renderDataTypeList = () => {
        switch (dataSource) {
            case ViewConstants.DATA_SOURCE_USERS:
                return (
                    <ServerUserList
                        currentUserId={currentUserId}
                        term={term}
                        tutorialWatched={true}
                        handleSelectProfile={handleSelectProfile}
                        selectedIds={selectedIds as {[id: string]: UserProfile}}
                        fetchFunction={userFetchFunction}
                        searchFunction={userSearchFunction}
                        createFilter={createUserFilter}
                        testID={'integration_selector.user_list'}
                        location={Screens.INTEGRATION_SELECTOR}
                    />
                );
            default:
                return (
                    <CustomList
                        data={customListData as (Channel[] | DialogOption[])}
                        key='custom_list'
                        loading={loading}
                        loadingComponent={renderLoading()}
                        noResults={renderNoResults}
                        onLoadMore={loadMore}
                        onRowPress={handleSelectItem}
                        renderItem={getRenderItem()}
                        theme={theme}
                    />
                );
        }
    };

    const selectedOptionsComponent = renderSelectedOptions();

    return (
        <SafeAreaView
            nativeID={SecurityManager.getShieldScreenId(componentId)}
            style={style.container}
        >
            <View
                testID='integration_selector.screen'
                style={style.searchBar}
            >
                <SearchBar
                    testID='selector.search_bar'
                    placeholder={intl.formatMessage({id: 'search_bar.search', defaultMessage: 'Search'})}
                    inputStyle={style.searchBarInput}
                    placeholderTextColor={changeOpacity(theme.centerChannelColor, 0.5)}
                    onChangeText={onSearch}
                    autoCapitalize='none'
                    keyboardAppearance={getKeyboardAppearanceFromTheme(theme)}
                    value={term}
                />
            </View>

            {selectedOptionsComponent}

            {renderDataTypeList()}
        </SafeAreaView>
    );
}

export default IntegrationSelector;
