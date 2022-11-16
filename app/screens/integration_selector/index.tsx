// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {fetchChannels, searchChannels} from '@actions/remote/channel';
import {fetchProfiles, searchProfiles} from '@actions/remote/user';
import UserListRow from '@app/components/user_list_row';
import {typography} from '@app/utils/typography';
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
            color: changeOpacity(theme.centerChannelColor, 0.5),
            ...typography('Body', 600, 'Regular'),
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
        ...typography('Body', 200, 'Regular'),
    };
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
        const currentSelected: Dictionary<UserProfile> | Dictionary<DialogOption> | Dictionary<Channel> = multiselectSelected;
        const multiselectSelectedItems = {...currentSelected};

        switch (dataSource) {
            case ViewConstants.DATA_SOURCE_USERS: {
                if (currentSelected[itemKey]) {
                    delete multiselectSelectedItems[itemKey];
                } else {
                    multiselectSelectedItems[itemKey] = item as UserProfile;
                }

                setMultiselectSelected(multiselectSelectedItems);
                return;
            }
            case ViewConstants.DATA_SOURCE_CHANNELS: {
                if (currentSelected[itemKey]) {
                    delete multiselectSelectedItems[itemKey];
                } else {
                    multiselectSelectedItems[itemKey] = item as Channel;
                }

                setMultiselectSelected(multiselectSelectedItems);
                return;
            }
            default: {
                if (currentSelected[itemKey]) {
                    delete multiselectSelectedItems[itemKey];
                } else {
                    multiselectSelectedItems[itemKey] = item as DialogOption;
                }
                setMultiselectSelected(multiselectSelectedItems);
            }
        }
    }, [integrationData, multiselectSelected, isMultiselect, dataSource, handleSelect]);

    const handleRemoveOption = (item: UserProfile | Channel | DialogOption) => {
        const currentSelected: Dictionary<UserProfile> | Dictionary<DialogOption> | Dictionary<Channel> = multiselectSelected;
        const itemKey = extractItemKey(dataSource, item);
        const multiselectSelectedItems = {...currentSelected};
        delete multiselectSelectedItems[itemKey];
        setMultiselectSelected(multiselectSelectedItems);
    };

    const getChannels = useCallback(debounce(async () => {
        if (next.current && !loading && !term) {
            setLoading(true);
            page.current += 1;

            const {channels: channelData} = await fetchChannels(serverUrl, currentTeamId, page.current);

            setLoading(false);

            if (channelData && channelData.length > 0) {
                setIntegrationData(channelData);
            } else {
                next.current = false;
            }
        }
    }, 100), [integrationData, loading, term]);

    const getProfiles = useCallback(debounce(async () => {
        if (next.current && !loading && !term) {
            setLoading(true);
            page.current += 1;

            const {users: profiles} = await fetchProfiles(serverUrl, page.current);

            setLoading(false);

            if (profiles && profiles.length > 0) {
                setIntegrationData(profiles);
            } else {
                next.current = false;
            }
        }
    }, 100), [integrationData, loading, term]);

    const loadMore = async () => {
        if (dataSource === ViewConstants.DATA_SOURCE_USERS) {
            await getProfiles();
        } else if (dataSource === ViewConstants.DATA_SOURCE_CHANNELS) {
            await getChannels();
        }

        // dynamic options are not paged so are not reloaded on scroll
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
        handleSelect(getMultiselectData());
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
                const {data: userData} = await searchProfiles(
                    serverUrl, term.toLowerCase(),
                    {team_id: currentTeamId, allow_inactive: true});

                if (userData) {
                    setSearchResults(userData);
                }
            } else if (dataSource === ViewConstants.DATA_SOURCE_CHANNELS) {
                const isSearch = true;
                const {channels: receivedChannels} = await searchChannels(
                    serverUrl, term, currentTeamId, isSearch);

                if (receivedChannels) {
                    setSearchResults(receivedChannels);
                }
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
    const renderLoading = () => {
        if (!loading) {
            return null;
        }

        let text;
        switch (dataSource) {
            case ViewConstants.DATA_SOURCE_USERS:
                text = {
                    id: intl.formatMessage({id: 'mobile.integration_selector.loading_users'}),
                    defaultMessage: 'Loading Users...',
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
        if (loading || page.current === INITIAL_PAGE) {
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
