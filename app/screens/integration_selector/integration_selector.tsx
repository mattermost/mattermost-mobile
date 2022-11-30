// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {fetchChannels, searchChannels} from '@actions/remote/channel';
import {fetchProfiles, searchProfiles} from '@actions/remote/user';
import {t} from '@app/i18n';
import FormattedText from '@components/formatted_text';
import SearchBar from '@components/search';
import {createProfilesSections} from '@components/user_list';
import UserListRow from '@components/user_list_row';
import {General, View as ViewConstants} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {debounce} from '@helpers/api/general';
import useNavButtonPressed from '@hooks/navigation_button_pressed';
import {
    buildNavigationButton,
    popTopScreen, setButtons,
} from '@screens/navigation';
import {WithDatabaseArgs} from '@typings/database/database';
import {filterChannelsMatchingTerm} from '@utils/channel';
import {changeOpacity, getKeyboardAppearanceFromTheme, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';
import {filterProfilesMatchingTerm} from '@utils/user';

import ChannelListRow from './channel_list_row';
import CustomList, {FLATLIST, SECTIONLIST} from './custom_list';
import OptionListRow from './option_list_row';
import SelectedOptions from './selected_options';

type DataType = DialogOption[] | Channel[] | UserProfile[];
type Selection = DialogOption | Channel | UserProfile | DataType;
type MultiselectSelectedMap = Dictionary<DialogOption> | Dictionary<Channel> | Dictionary<UserProfile>;
type UserProfileSection = {
    id: string;
    data: UserProfile[];
};

const VALID_DATASOURCES = [
    ViewConstants.DATA_SOURCE_CHANNELS,
    ViewConstants.DATA_SOURCE_USERS,
    ViewConstants.DATA_SOURCE_DYNAMIC];
const SUBMIT_BUTTON_ID = 'submit-integration-selector-multiselect';

const close = () => {
    popTopScreen();
};

const extractItemKey = (dataSource: string, item: Selection): string => {
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

    if (current[key]) {
        delete newMap[key];
    } else {
        newMap[key] = item;
    }

    return newMap;
};

const filterSearchData = (source: string, searchData: DataType, searchTerm: string) => {
    if (!searchData) {
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

    return (searchData as DialogOption[]).filter((option) => option.text && option.text.includes(lowerCasedTerm));
};

export type Props = {
    getDynamicOptions?: (userInput?: string) => Promise<DialogOption[]>;
    options?: PostActionOption[];
    currentTeamId: string;
    data?: DataType;
    dataSource: string;
    handleSelect: (opt: Selection) => void;
    isMultiselect?: boolean;
    selected: SelectedDialogValue;
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
            color: changeOpacity(theme.centerChannelColor, 0.5),
            ...typography('Body', 600, 'Regular'),
        },
        searchBarInput: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.2),
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
        currentTeamId, componentId, getDynamicOptions, options, teammateNameDisplay}: Props) {
    const serverUrl = useServerUrl();
    const theme = useTheme();
    const searchTimeoutId = useRef<NodeJS.Timeout | null>(null);
    const style = getStyleSheet(theme);
    const intl = useIntl();

    // HOOKS
    const [integrationData, setIntegrationData] = useState<DataType>(data || []);
    const [loading, setLoading] = useState<boolean>(false);
    const [term, setTerm] = useState<string>('');
    const [searchResults, setSearchResults] = useState<DataType>([]);
    const [multiselectSelected, setMultiselectSelected] = useState<MultiselectSelectedMap>({});
    const [customListData, setCustomListData] = useState<DataType | UserProfileSection[]>([]);

    const page = useRef<number>(-1);
    const next = useRef<boolean>(VALID_DATASOURCES.includes(dataSource));

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

        const itemKey = extractItemKey(dataSource, item);

        switch (dataSource) {
            case ViewConstants.DATA_SOURCE_USERS: {
                setMultiselectSelected((current) => toggleFromMap(current, itemKey, item as UserProfile));
                return;
            }
            case ViewConstants.DATA_SOURCE_CHANNELS: {
                setMultiselectSelected((current) => toggleFromMap(current, itemKey, item as Channel));
                return;
            }
            default: {
                setMultiselectSelected((current) => toggleFromMap(current, itemKey, item as DialogOption));
            }
        }
    }, [isMultiselect, dataSource, handleSelect]);

    const handleRemoveOption = useCallback((item: UserProfile | Channel | DialogOption) => {
        const itemKey = extractItemKey(dataSource, item);
        setMultiselectSelected((current) => {
            const multiselectSelectedItems = {...current};
            delete multiselectSelectedItems[itemKey];
            return multiselectSelectedItems;
        });
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

    const getProfiles = useCallback(debounce(async () => {
        if (next.current && !loading && !term) {
            setLoading(true);
            page.current += 1;

            const {users: profiles} = await fetchProfiles(serverUrl, page.current);

            setLoading(false);

            if (profiles && profiles.length > 0) {
                setIntegrationData([...integrationData as UserProfile[], ...profiles]);
            } else {
                next.current = false;
            }
        }
    }, 100), [loading, term, integrationData]);

    const loadMore = useCallback(async () => {
        if (dataSource === ViewConstants.DATA_SOURCE_USERS) {
            await getProfiles();
        } else if (dataSource === ViewConstants.DATA_SOURCE_CHANNELS) {
            await getChannels();
        }

        // dynamic options are not paged so are not reloaded on scroll
    }, [getProfiles, getChannels, dataSource]);

    const searchDynamicOptions = useCallback(async (searchTerm = '') => {
        if (options && options !== integrationData && !searchTerm) {
            setIntegrationData(options);
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
    }, [options, getDynamicOptions, integrationData]);

    const onHandleMultiselectSubmit = useCallback(() => {
        handleSelect(Object.values(multiselectSelected));
        close();
    }, [multiselectSelected, handleSelect]);

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

            if (dataSource === ViewConstants.DATA_SOURCE_USERS) {
                const {data: userData} = await searchProfiles(
                    serverUrl, text.toLowerCase(),
                    {team_id: currentTeamId, allow_inactive: true});

                if (userData) {
                    setSearchResults(userData);
                }
            } else if (dataSource === ViewConstants.DATA_SOURCE_CHANNELS) {
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
    }, [dataSource, integrationData, currentTeamId]);

    // Effects
    useNavButtonPressed(SUBMIT_BUTTON_ID, componentId, onHandleMultiselectSubmit, [onHandleMultiselectSubmit]);

    useEffect(() => {
        return () => {
            if (searchTimeoutId.current) {
                clearTimeout(searchTimeoutId.current);
                searchTimeoutId.current = null;
            }
        };
    }, []);

    useEffect(() => {
        if (dataSource === ViewConstants.DATA_SOURCE_USERS) {
            getProfiles();
        } else if (dataSource === ViewConstants.DATA_SOURCE_CHANNELS) {
            getChannels();
        } else {
            // Static and dynamic option search
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
                const option = options?.find((opt) => opt.value === value);
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
            case ViewConstants.DATA_SOURCE_USERS:
                text = {
                    id: t('mobile.integration_selector.loading_users'),
                    defaultMessage: 'Loading Users...',
                };
                break;
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
    }, [style, dataSource, loading, intl]);

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
        const itemSelected = Boolean(multiselectSelected[itemProps.item.value]);
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

    const renderUserItem = useCallback((itemProps: any): JSX.Element => {
        const itemSelected = Boolean(multiselectSelected[itemProps.item.id]);

        return (
            <UserListRow
                key={itemProps.id}
                {...itemProps}
                theme={theme}
                selectable={isMultiselect}
                user={itemProps.item}
                teammateNameDisplay={teammateNameDisplay}
                selected={itemSelected}
            />
        );
    }, [multiselectSelected, theme, isMultiselect, teammateNameDisplay]);

    const getRenderItem = (): (itemProps: any) => JSX.Element => {
        switch (dataSource) {
            case ViewConstants.DATA_SOURCE_USERS:
                return renderUserItem;
            case ViewConstants.DATA_SOURCE_CHANNELS:
                return renderChannelItem;
            default:
                return renderOptionItem;
        }
    };

    const renderSelectedOptions = useCallback((): React.ReactElement<string> | null => {
        const selectedItems: Channel[] | DialogOption[] | UserProfile[] = Object.values(multiselectSelected);

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
    }, [multiselectSelected, style, theme]);

    const listType = dataSource === ViewConstants.DATA_SOURCE_USERS ? SECTIONLIST : FLATLIST;
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
                    inputStyle={style.searchBarInput}
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
                renderItem={getRenderItem()}
                theme={theme}
            />
        </SafeAreaView>
    );
}

export default IntegrationSelector;
