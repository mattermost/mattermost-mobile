// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { withDatabase } from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';

import SearchBar from '@components/search';
import { changeOpacity, getKeyboardAppearanceFromTheme, makeStyleSheetFromTheme } from '@utils/theme';
import { fetchChannels, searchChannels as searchChannelsRemote } from '@actions/remote/channel';
import { fetchProfiles, searchProfiles as searchProfilesRemote } from '@actions/remote/user';
import { General } from '@constants';
import { useTheme } from '@context/theme';
import FormattedText from '@components/formatted_text';
import { View as ViewConstants } from '@constants';
import {
    buildNavigationButton,
    popTopScreen, setButtons,
} from '@screens/navigation';
import { Navigation } from 'react-native-navigation';

import CustomList, { FLATLIST, SECTIONLIST } from './custom_list';
import OptionListRow from './option_list_row';
import ChannelListRow from './channel_list_row';
import UserListRow from './user_list_row';
import { useIntl } from 'react-intl';
import { debounce } from '@app/helpers/api/general';
import SelectedOptions from './selected_options';
import { filterProfilesMatchingTerm } from '@utils/user';
import { filterChannelsMatchingTerm } from '@utils/channel';

import { useServerUrl } from '@app/context/server';
import { observeCurrentTeamId } from '@app/queries/servers/system';
import { WithDatabaseArgs } from '@typings/database/database';
import { createProfilesSections } from '../create_direct_message/user_list';
import { ScrollView } from 'react-native-gesture-handler';

type DataType = DialogOption[] | Channel[] | UserProfile[];
type Selection = DialogOption | Channel | UserProfile | DialogOption[] | Channel[] | UserProfile[];
type MultiselectSelectedMap = Dictionary<DialogOption> | Dictionary<Channel> | Dictionary<UserProfile>;

type Props = {
    getDynamicOptions?: (userInput?: string) => Promise<DialogOption[]>;
    options?: PostActionOption[];
    actions: any,
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
    { dataSource, data, isMultiselect, selected, handleSelect,
        currentTeamId, componentId, getDynamicOptions, options, teammateNameDisplay }: Props) {

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
    const [term, setTerm] = useState<string>("");
    const [searchResults, setSearchResults] = useState<DialogOption[]>([]);
    const [multiselectSelected, setMultiselectSelected] = useState<MultiselectSelectedMap>({});
    const [currentPage, setCurrentPage] = useState<number>(-1);
    const [next, setNext] = useState<boolean>(dataSource === ViewConstants.DATA_SOURCE_USERS || dataSource === ViewConstants.DATA_SOURCE_CHANNELS || dataSource === ViewConstants.DATA_SOURCE_DYNAMIC);
    const [customListData, setCustomListData] = useState([]);

    let selectedScroll = React.createRef<ScrollView>();
    let multiselectItems: MultiselectSelectedMap = {}
    if (isMultiselect && selected && !([ViewConstants.DATA_SOURCE_USERS, ViewConstants.DATA_SOURCE_CHANNELS].includes(dataSource))) {
        selected.forEach((opt) => {
            multiselectItems[opt.value] = opt;
        });

        setMultiselectSelected(multiselectItems);
    }

    // Callbacks
    const clearSearch = () => {
        setTerm('');
        setSearchResults([]);
    };

    const close = () => {
        popTopScreen();
    };

    // This is the button to submit multiselect options
    const SUBMIT_BUTTON_ID = 'submit-integration-selector-multiselect';
    const rightButton = useMemo(() => {
        const base = buildNavigationButton(
            SUBMIT_BUTTON_ID,
            'integration_selector.multiselect.submit.button',
            undefined,
            intl.formatMessage({ id: 'integration_selector.multiselect.submit', defaultMessage: 'Done' }),
        );
        base.enabled = true;
        base.showAsAction = 'always';
        base.color = theme.sidebarHeaderTextColor;
        return base;
    }, [theme.sidebarHeaderTextColor, intl]);

    const handleSelectItem = (item: UserProfile | Channel | DialogOption) => {
        if (!isMultiselect) {
            handleSelect(item);
            close();
            return;
        }

        switch (dataSource) {
            case ViewConstants.DATA_SOURCE_USERS: {
                const currentSelected = multiselectSelected as Dictionary<UserProfile>;
                const typedItem = item as UserProfile;
                const multiselectSelectedItems = { ...currentSelected };
                if (currentSelected[typedItem.id]) {
                    delete multiselectSelectedItems[typedItem.id];
                } else {
                    multiselectSelectedItems[typedItem.id] = typedItem;
                }
                setMultiselectSelected(multiselectSelectedItems);
                break;
            }
            case ViewConstants.DATA_SOURCE_CHANNELS: {
                const currentSelected = multiselectSelected as Dictionary<Channel>;
                const typedItem = item as Channel;
                const multiselectSelectedItems = { ...currentSelected };
                if (currentSelected[typedItem.id]) {
                    delete multiselectSelectedItems[typedItem.id];
                } else {
                    multiselectSelectedItems[typedItem.id] = typedItem;
                }
                setMultiselectSelected(multiselectSelectedItems);
                break;
            }
            default: {
                const currentSelected = multiselectSelected as Dictionary<DialogOption>;
                const typedItem = item as DialogOption;
                const multiselectSelectedItems = { ...currentSelected };
                if (currentSelected[typedItem.value]) {
                    delete multiselectSelectedItems[typedItem.value];
                } else {
                    multiselectSelectedItems[typedItem.value] = typedItem;
                }
                setMultiselectSelected(multiselectSelectedItems);
            }
        }

        setTimeout(() => {
            if (selectedScroll.current) {
                selectedScroll.current.scrollToEnd();
            }
        });
    };

    const handleRemoveOption = (item: UserProfile | Channel | DialogOption) => {
        switch (dataSource) {
            case ViewConstants.DATA_SOURCE_USERS: {
                const currentSelected = multiselectSelected as Dictionary<UserProfile>;
                const typedItem = item as UserProfile;
                const multiselectSelectedItems = { ...currentSelected };
                delete multiselectSelectedItems[typedItem.id];
                setMultiselectSelected(multiselectSelectedItems);
                return;
            }
            case ViewConstants.DATA_SOURCE_CHANNELS: {
                const currentSelected = multiselectSelected as Dictionary<Channel>;
                const typedItem = item as Channel;
                const multiselectSelectedItems = { ...currentSelected };
                delete multiselectSelectedItems[typedItem.id];
                setMultiselectSelected(multiselectSelectedItems);
                return;
            }
            default: {
                const currentSelected = multiselectSelected as Dictionary<DialogOption>;
                const typedItem = item as DialogOption;
                const multiselectSelectedItems = { ...currentSelected };
                delete multiselectSelectedItems[typedItem.value];
                setMultiselectSelected(multiselectSelectedItems);
            }
        }
    };

    const getChannels = debounce(async () => {
        if (next && !loading && !term) {
            setLoading(true);
            setCurrentPage(currentPage + 1);
            const { channels: channelData } = await fetchChannels(serverUrl, currentTeamId);

            if (channelData) {
                loadedChannels({ data: channelData });
            }
        }
    }, 100);

    const getProfiles = debounce(async () => {
        if (next && !loading && !term) {
            setLoading(true);
            setCurrentPage(currentPage + 1);
            const { users: userData } = await fetchProfiles(serverUrl, currentPage);

            if (userData) {
                loadedProfiles(userData);
            }
        }
    }, 100);

    const getDynamicOptionsLocally = () => {
        if (!loading && !term) {
            searchDynamicOptions('');
        }
    };

    const loadedChannels = ({ data: channels }: { data: Channel[] }) => {
        if (channels && !channels.length) {
            setNext(false);
        }

        setCurrentPage(currentPage + 1);
        setLoading(false);
        setIntegrationData(channels);
    };

    const loadedProfiles = (profiles: UserProfile[]) => {
        if (profiles && !profiles.length) {
            setNext(false);
        }

        setCurrentPage(currentPage + 1);
        setLoading(false);
        setIntegrationData(profiles);
    };

    const loadMore = () => {
        if (dataSource === ViewConstants.DATA_SOURCE_USERS) {
            getProfiles();
        } else if (dataSource === ViewConstants.DATA_SOURCE_CHANNELS) {
            getChannels();
        }

        // dynamic options are not paged so are not reloaded on scroll
    };

    const searchChannels = async (term: string) => {
        const isSearch = true;
        const { channels: receivedChannels } = await searchChannelsRemote(serverUrl, term, currentTeamId, isSearch);
        setLoading(false);

        if (receivedChannels) {
            setSearchResults(receivedChannels);
        }
    };

    const searchProfiles = async (term: string) => {
        setLoading(true)

        const { data: userData } = await searchProfilesRemote(serverUrl, term.toLowerCase(), { team_id: currentTeamId, allow_inactive: true });
        setLoading(false);

        if (userData) {
            setSearchResults(userData);
        }
    };

    const searchDynamicOptions = (term = '') => {
        if (options) {
            setIntegrationData(options);
        }

        if (!getDynamicOptions) {
            return;
        }

        setLoading(true);

        getDynamicOptions(term.toLowerCase()).then((results: DialogOption[]) => {
            let data = results || [];

            if (term) {
                setSearchResults(data);
            } else {
                setIntegrationData(data);
            }

            setLoading(false);
        });
    };

    const onSearch = (text: string) => {
        if (text) {
            setTerm(text);
            if (searchTimeoutId.current) {
                clearTimeout(searchTimeoutId.current);
            }

            searchTimeoutId.current = setTimeout(() => {
                if (!dataSource) {
                    setSearchResults(filterSearchData(null, data, text));
                    return;
                }

                if (dataSource === ViewConstants.DATA_SOURCE_USERS) {
                    searchProfiles(text);
                } else if (dataSource === ViewConstants.DATA_SOURCE_CHANNELS) {
                    searchChannels(text);
                } else if (dataSource === ViewConstants.DATA_SOURCE_DYNAMIC) {
                    searchDynamicOptions(text);
                }
            }, General.SEARCH_TIMEOUT_MILLISECONDS);
        } else {
            clearSearch();
        }
    };

    const filterSearchData = (dataSource: string, data: DataType, term: string) => {
        if (!data) {
            return [];
        }

        const lowerCasedTerm = term.toLowerCase();

        if (dataSource === ViewConstants.DATA_SOURCE_USERS) {
            return filterProfilesMatchingTerm(data as UserProfile[], lowerCasedTerm);
        } else if (dataSource === ViewConstants.DATA_SOURCE_CHANNELS) {
            return filterChannelsMatchingTerm(data as Channel[], lowerCasedTerm);
        } else if (dataSource === ViewConstants.DATA_SOURCE_DYNAMIC) {
            return data;
        }

        return (data as DialogOption[]).filter((option) => option.text && option.text.toLowerCase().startsWith(lowerCasedTerm));
    };

    const handleMultiselectSubmit = () => {
        // TODO Will be finished once we have Apps multiselect
    }

    // Effects
    useEffect(() => {
        if (dataSource === ViewConstants.DATA_SOURCE_USERS) {
            getProfiles();
        } else if (dataSource === ViewConstants.DATA_SOURCE_CHANNELS) {
            getChannels();
        } else {
            getDynamicOptionsLocally();
        }
    }, [])

    useEffect(() => {
        let listData = integrationData;
        if (term) {
            listData = searchResults;
        }

        if (dataSource === ViewConstants.DATA_SOURCE_USERS) {
            listData = createProfilesSections(listData);
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

        Navigation.events().registerComponentListener({
            navigationButtonPressed: ({ buttonId }: { buttonId: string }) => {
                if (buttonId == SUBMIT_BUTTON_ID) {
                    handleMultiselectSubmit();
                }
            },
        }, componentId);
    }, [rightButton, componentId]);

    // Renders
    const renderLoading = (): React.ReactElement<any, string> | null => {
        if (!loading) {
            return null;
        }

        let text;
        switch (dataSource) {
            case ViewConstants.DATA_SOURCE_USERS:
                text = {
                    id: intl.formatMessage({ id: 'mobile.integration_selector.loading_users' }),
                    defaultMessage: 'Loading Channels...',
                };
                break;
            case ViewConstants.DATA_SOURCE_CHANNELS:
                text = {
                    id: intl.formatMessage({ id: 'mobile.integration_selector.loading_channels' }),
                    defaultMessage: 'Loading Channels...',
                };
                break;
            default:
                text = {
                    id: intl.formatMessage({ id: 'mobile.integration_selector.loading_options' }),
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
        if (loading || currentPage === -1) {
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
        const selected = Boolean(multiselectSelected[props.id]);
        return (
            <ChannelListRow
                key={props.id}
                {...props}

                theme={theme}
                channel={props.item}
                selectable={true}
                selected={selected}
            />
        );
    };

    const renderOptionItem = (props: any) => {
        const selected = Boolean(multiselectSelected[props.id]);
        return (
            <OptionListRow
                key={props.id}
                {...props}
                theme={theme}
                selectable={true}
                selected={selected}
            />
        );
    };

    const renderUserItem = (props: any) => {
        const selected = Boolean(multiselectSelected[props.id]);
        return (
            <UserListRow
                key={props.id}
                {...props}
                theme={theme}
                selectable={true}
                user={props.item}
                teammateNameDisplay={teammateNameDisplay}
                selected={selected}
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
                        ref={selectedScroll}
                        theme={theme}
                        selectedOptions={selectedItems}
                        dataSource={dataSource}
                        onRemove={handleRemoveOption}
                    />
                    <View style={style.separator} />
                </>
            );
        }

        return optionComponents;
    }

    const listType = dataSource === ViewConstants.DATA_SOURCE_USERS ? SECTIONLIST : FLATLIST;
    let rowComponent;
    if (dataSource === ViewConstants.DATA_SOURCE_USERS) {
        rowComponent = renderUserItem;
    } else if (dataSource === ViewConstants.DATA_SOURCE_CHANNELS) {
        rowComponent = renderChannelItem;
    } else {
        rowComponent = renderOptionItem;
    }

    let selectedOptionsComponent = renderSelectedOptions();

    return (
        <SafeAreaView style={style.container}>
            <View
                testID='integration_selector.screen'
                style={style.searchBar}
            >
                <SearchBar
                    testID='selector.search_bar'
                    placeholder={intl.formatMessage({ id: 'search_bar.search', defaultMessage: 'Search' })}
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
                data={customListData}
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

const withTeamId = withObservables([], ({ database }: WithDatabaseArgs) => ({
    currentTeamId: observeCurrentTeamId(database),
}));

export default withDatabase(withTeamId(IntegrationSelector));
