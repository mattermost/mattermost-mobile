// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {FlatList, SectionList, Text, View, type DefaultSectionT, type ListRenderItemInfo, type SectionListData} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {switchToChannelById} from '@actions/remote/channel';
import FormattedText from '@components/formatted_text';
import Loading from '@components/loading';
import SearchBar from '@components/search';
import {General, Screens} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import SecurityManager from '@managers/security_manager';
import {fetchPlaybooks} from '@playbooks/actions/remote/playbooks';
import {fetchPlaybookRunsForChannel} from '@playbooks/actions/remote/runs';
import {
    popTo,
    popTopScreen,
} from '@screens/navigation';
import {changeOpacity, getKeyboardAppearanceFromTheme, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import {goToPlaybookRun, goToStartARun} from '../navigation';

import PlaybookRow from './playbook_row';

import type {AvailableScreens} from '@typings/screens/navigation';

const close = () => {
    popTopScreen();
};

export type Props = {
    currentTeamId: string;
    currentUserId: string;
    componentId: AvailableScreens;
    playbooksUsedInChannel: Set<string>;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            flex: 1,
            paddingHorizontal: 20,
            paddingVertical: 24,
            gap: 24,
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
        sectionHeader: {
            color: changeOpacity(theme.centerChannelColor, 0.56),
            ...typography('Body', 75, 'SemiBold'),
            textTransform: 'uppercase',
        },
    };
});

const EMPTY_DATA: Playbook[] = [];

function SelectPlaybook({
    currentTeamId,
    currentUserId,
    componentId,
    playbooksUsedInChannel,
}: Props) {
    const serverUrl = useServerUrl();
    const theme = useTheme();
    const searchTimeoutId = useRef<NodeJS.Timeout | null>(null);
    const style = getStyleSheet(theme);
    const intl = useIntl();

    // HOOKS
    const [loading, setLoading] = useState<boolean>(false);
    const [searching, setSearching] = useState<boolean>(false);
    const [term, setTerm] = useState<string>('');
    const [data, setData] = useState<Playbook[]>([]);
    const [searchResults, setSearchResults] = useState<Playbook[]>([]);

    const page = useRef<number>(-1);
    const next = useRef<boolean>(true);

    // Callbacks
    const clearSearch = useCallback(() => {
        setTerm('');
        setSearchResults([]);
        setSearching(false);
    }, []);

    const loadMore = useCallback(async () => {
        if (next.current && !loading) {
            setLoading(true);
            const result = await fetchPlaybooks(serverUrl, {
                team_id: currentTeamId,
                page: page.current + 1,
            });

            if (result.data) {
                setData((prev) => [...prev, ...result.data.items]);
            }

            page.current++;
            next.current = Boolean(result.data?.has_more);
            setLoading(false);
        }
    }, [loading, serverUrl, currentTeamId]);

    const onSearch = useCallback((text: string) => {
        if (!text) {
            clearSearch();
            return;
        }

        setTerm(text);
        setSearching(true);

        if (searchTimeoutId.current) {
            clearTimeout(searchTimeoutId.current);
        }

        searchTimeoutId.current = setTimeout(async () => {
            const result = await fetchPlaybooks(serverUrl, {
                team_id: currentTeamId,
                search_term: text,
                sort: 'last_run_at',
            });

            if (result.data) {
                setSearchResults(result.data.items);
            }

            setSearching(false);
        }, General.SEARCH_TIMEOUT_MILLISECONDS);
    }, [clearSearch, serverUrl, currentTeamId]);

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
        loadMore();

        // We only want to load the playbooks once on mount
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const renderNoResults = useCallback((): JSX.Element | null => {
        if (searching || (loading && page.current === -1)) {
            return (
                <Loading
                    color={theme.buttonBg}
                    containerStyle={style.loadingContainer}
                    size='large'
                />
            );
        }

        return (
            <View style={style.noResultContainer}>
                <FormattedText
                    id='playbooks.create_run.select_playbook.no_results'
                    defaultMessage='No Results'
                    style={style.noResultText}
                />
            </View>
        );
    }, [loading, searching, style.loadingContainer, style.noResultContainer, style.noResultText, theme.buttonBg]);

    const onRunCreated = useCallback(async (run: PlaybookRun) => {
        await popTo(Screens.HOME);
        await fetchPlaybookRunsForChannel(serverUrl, run.channel_id);
        await switchToChannelById(serverUrl, run.channel_id);
        await goToPlaybookRun(intl, run.id);
    }, [intl, serverUrl]);

    const onPress = useCallback((playbook: Playbook) => {
        goToStartARun(intl, theme, playbook, onRunCreated);
    }, [intl, onRunCreated, theme]);

    const renderItem = useCallback(({item}: ListRenderItemInfo<Playbook>) => {
        return (
            <PlaybookRow
                playbook={item}
                onPress={onPress}
            />
        );
    }, [onPress]);

    const renderLoading = useCallback(() => {
        if (!loading) {
            return null;
        }

        return (
            <Loading
                color={theme.buttonBg}
                containerStyle={style.loadingContainer}
                size='large'
            />
        );
    }, [loading, style.loadingContainer, theme.buttonBg]);

    const renderSectionHeader = useCallback(({section}: {section: SectionListData<Playbook, DefaultSectionT>}) => {
        return (
            <Text style={style.sectionHeader}>{section.title}</Text>
        );
    }, [style.sectionHeader]);

    const sections: Array<SectionListData<Playbook, DefaultSectionT>> = useMemo(() => {
        type PlaybookSections = {
            inThisChannel: Playbook[];
            yourPlaybooks: Playbook[];
            otherPlaybooks: Playbook[];
        }
        const reducedPlaybooks = data.reduce<PlaybookSections>((acc, playbook) => {
            function isMember(member: PlaybookMember) {
                return member.user_id === currentUserId;
            }
            if (playbooksUsedInChannel.has(playbook.id)) {
                acc.inThisChannel.push(playbook);
            } else if (playbook.members.some(isMember)) {
                acc.yourPlaybooks.push(playbook);
            } else {
                acc.otherPlaybooks.push(playbook);
            }
            return acc;
        }, {inThisChannel: [], yourPlaybooks: [], otherPlaybooks: []});
        const allSections = [
            {
                title: intl.formatMessage({id: 'playbooks.select_playbook.in_this_channel', defaultMessage: 'In This Channel'}),
                data: reducedPlaybooks.inThisChannel,
            },
            {
                title: intl.formatMessage({id: 'playbooks.select_playbook.your_playbooks', defaultMessage: 'Your Playbooks'}),
                data: reducedPlaybooks.yourPlaybooks,
            },
            {
                title: intl.formatMessage({id: 'playbooks.select_playbook.other_playbooks', defaultMessage: 'Other Playbooks'}),
                data: reducedPlaybooks.otherPlaybooks,
            },
        ];

        return allSections.filter((section) => section.data.length > 0);
    }, [currentUserId, data, intl, playbooksUsedInChannel]);

    let shownData = EMPTY_DATA;
    if (!loading) {
        if (term) {
            shownData = searchResults;
        } else {
            shownData = data;
        }
    }

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
                    showLoading={searching}
                />
            </View>
            {term && (
                <FlatList
                    data={shownData}
                    renderItem={renderItem}
                    ListEmptyComponent={renderNoResults}
                    onEndReached={loadMore}
                    ListFooterComponent={renderLoading}
                />
            )}
            {!term && (
                <SectionList
                    sections={sections}
                    renderSectionHeader={renderSectionHeader}
                    renderItem={renderItem}
                    ListEmptyComponent={renderNoResults}
                    onEndReached={loadMore}
                    ListFooterComponent={renderLoading}
                />
            )}
        </SafeAreaView>
    );
}

export default SelectPlaybook;
