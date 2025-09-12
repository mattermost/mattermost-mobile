// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {defineMessages, useIntl} from 'react-intl';
import {View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {fetchProfilesInTeam, searchProfiles} from '@actions/remote/user';
import Button from '@components/button';
import SearchBar from '@components/search';
import ServerUserList from '@components/server_user_list';
import {General, Screens} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import SecurityManager from '@managers/security_manager';
import {
    popTopScreen,
} from '@screens/navigation';
import {changeOpacity, getKeyboardAppearanceFromTheme, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import type {AvailableScreens} from '@typings/screens/navigation';

const close = () => {
    popTopScreen();
};

export type Props = {
    currentTeamId: string;
    currentUserId: string;
    handleSelect: (opt: UserProfile) => void;
    handleRemove?: () => void;
    selected?: string;
    componentId: AvailableScreens;
    participantIds: string[];
}

const messages = defineMessages({
    participants: {
        id: 'playbooks.select_user.participants',
        defaultMessage: 'RUN PARTICIPANTS',
    },
    notParticipants: {
        id: 'playbooks.select_user.not_participants',
        defaultMessage: 'NOT PARTICIPATING',
    },
});

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            flex: 1,
        },
        searchBar: {
            marginVertical: 12,
            height: 38,
            paddingHorizontal: 12,
            flexDirection: 'row',
        },
        searchbarComponentContainer: {
            flex: 1,
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
    };
});

function SelectUser({
    selected,
    handleSelect,
    handleRemove,
    currentTeamId,
    currentUserId,
    componentId,
    participantIds,
}: Props) {
    const serverUrl = useServerUrl();
    const theme = useTheme();
    const searchTimeoutId = useRef<NodeJS.Timeout | null>(null);
    const style = getStyleSheet(theme);
    const intl = useIntl();

    // HOOKS
    const [term, setTerm] = useState<string>('');

    const selectedIds = useMemo(() => {
        if (selected) {
            return new Set([selected]);
        }
        return new Set<string>();
    }, [selected]);

    // Callbacks
    const clearSearch = useCallback(() => {
        setTerm('');
    }, []);

    const handleSelectProfile = useCallback((user: UserProfile): void => {
        handleSelect(user);
        close();
    }, [handleSelect]);

    const handleSelectRemove = useCallback(() => {
        handleRemove?.();
        close();
    }, [handleRemove]);

    // Effects
    useAndroidHardwareBackHandler(componentId, close);

    useEffect(() => {
        return () => {
            if (searchTimeoutId.current) {
                clearTimeout(searchTimeoutId.current);
                searchTimeoutId.current = null;
            }
        };
    }, []);

    const onSearch = useCallback((text: string) => {
        if (!text) {
            clearSearch();
            return;
        }

        setTerm(text);

        if (searchTimeoutId.current) {
            clearTimeout(searchTimeoutId.current);
        }
    }, [clearSearch]);

    const userFetchFunction = useCallback(async (userFetchPage: number) => {
        const result = await fetchProfilesInTeam(serverUrl, currentTeamId, userFetchPage, General.PROFILE_CHUNK_SIZE, undefined, {active: true});
        if (result.users?.length) {
            return result.users;
        }

        return [];
    }, [serverUrl, currentTeamId]);

    const userSearchFunction = useCallback(async (searchTerm: string) => {
        const lowerCasedTerm = searchTerm.toLowerCase();
        const results = await searchProfiles(serverUrl, lowerCasedTerm, {team_id: currentTeamId, allow_inactive: false});

        if (results.data) {
            return results.data;
        }

        return [];
    }, [currentTeamId, serverUrl]);

    const createUserFilter = useCallback((exactMatches: UserProfile[], searchTerm: string) => {
        return (p: UserProfile) => {
            if (p.username === searchTerm || p.username.startsWith(searchTerm)) {
                exactMatches.push(p);
                return false;
            }

            return true;
        };
    }, []);

    const customSection = useCallback((profiles: UserProfile[]) => {
        if (!profiles.length) {
            return [];
        }

        const sections = new Map<string, UserProfile[]>();
        const participantsKey = intl.formatMessage(messages.participants);
        const notParticipantsKey = intl.formatMessage(messages.notParticipants);

        const participantsMap = new Set<string>();
        participantIds.forEach((id) => {
            participantsMap.add(id);
        });

        profiles.forEach((p) => {
            const sectionKey = participantsMap.has(p.id) ? participantsKey : notParticipantsKey;
            const sectionValue = sections.get(sectionKey) || [];
            const section = [...sectionValue, p];
            sections.set(sectionKey, section);
        });

        const results = [];
        let index = 0;
        for (const k of [participantsKey, notParticipantsKey]) { // This is to ensure order of sections
            const v = sections.get(k) || [];
            if (v.length) {
                results.push({
                    first: index === 0,
                    id: k,
                    data: v,
                });
                index++;
            }
        }
        return results;
    }, [intl, participantIds]);

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
                    containerStyle={style.searchbarComponentContainer}
                />
                {Boolean(handleRemove) && !term && (
                    <Button
                        text={intl.formatMessage({id: 'playbooks.select_user.no_assignee', defaultMessage: 'No Assignee'})}
                        theme={theme}
                        onPress={handleSelectRemove}
                        emphasis='link'
                    />
                )}
            </View>
            <ServerUserList
                currentUserId={currentUserId}
                term={term}
                tutorialWatched={true}
                handleSelectProfile={handleSelectProfile}
                selectedIds={selectedIds}
                fetchFunction={userFetchFunction}
                searchFunction={userSearchFunction}
                createFilter={createUserFilter}
                testID={'integration_selector.user_list'}
                location={Screens.PLAYBOOK_SELECT_USER}
                customSection={customSection}
            />
        </SafeAreaView>
    );
}

export default SelectUser;
