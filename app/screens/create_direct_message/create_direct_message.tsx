// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo, useRef, useState} from 'react';
import {defineMessages, useIntl} from 'react-intl';
import {Platform, SafeAreaView, StyleSheet, View} from 'react-native';

import {makeDirectChannel, makeGroupChannel} from '@actions/remote/channel';
import {fetchProfiles, fetchProfilesInTeam, searchProfiles} from '@actions/remote/user';
import Search from '@components/search';
import UsersModal from '@components/users_modal';
import {General} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {t} from '@i18n';
import {alertErrorWithFallback} from '@utils/draft';
import {changeOpacity, getKeyboardAppearanceFromTheme} from '@utils/theme';
import {displayUsername} from '@utils/user';

const style = StyleSheet.create({
    container: {
        flex: 1,
    },
    searchBar: {
        marginLeft: 12,
        marginRight: Platform.select({ios: 4, default: 12}),
        marginVertical: 12,
    },
});

const messages = defineMessages({
    dm: {
        id: t('mobile.open_dm.error'),
        defaultMessage: "We couldn't open a direct message with {displayName}. Please check your connection and try again.",
    },
    gm: {
        id: t('mobile.open_gm.error'),
        defaultMessage: "We couldn't open a group message with those users. Please check your connection and try again.",
    },
    button: {
        id: t('mobile.create_direct_message.start'),
        defaultMessage: 'Start',
    },
});

type Props = {
    componentId: string;
    currentTeamId: string;
    currentUserId: string;
    restrictDirectMessage: boolean;
    teammateNameDisplay: string;
}

export default function CreateDirectMessage({
    componentId,
    currentTeamId,
    currentUserId,
    restrictDirectMessage,
    teammateNameDisplay,
}: Props) {
    const serverUrl = useServerUrl();
    const theme = useTheme();
    const intl = useIntl();

    const searchTimeoutId = useRef<NodeJS.Timeout | null>(null);
    const page = useRef<number>(-1);

    const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(false);
    const [term, setTerm] = useState('');
    const [selectedIds, setSelectedIds] = useState<{[id: string]: UserProfile}>({});
    const selectedCount = useMemo(() => Object.keys(selectedIds).length, [selectedIds]);

    const clearSearch = useCallback(() => {
        setTerm('');
        setSearchResults([]);
    }, []);

    const getProfiles = useCallback(async () => {
        if (restrictDirectMessage) {
            return fetchProfilesInTeam(serverUrl, currentTeamId, page.current + 1, General.PROFILE_CHUNK_SIZE);
        }
        return fetchProfiles(serverUrl, page.current + 1, General.PROFILE_CHUNK_SIZE);
    }, [restrictDirectMessage, serverUrl, currentTeamId]);

    const handleRemoveProfile = useCallback((id: string) => {
        const newSelectedIds = Object.assign({}, selectedIds);

        Reflect.deleteProperty(newSelectedIds, id);

        setSelectedIds(newSelectedIds);
    }, [selectedIds]);

    const createDirectChannel = useCallback(async (id: string): Promise<boolean> => {
        const user = selectedIds[id];
        const displayName = displayUsername(user, intl.locale, teammateNameDisplay);

        const result = await makeDirectChannel(serverUrl, id, displayName);
        if (result.error) {
            alertErrorWithFallback(intl, result.error, messages.dm, {displayName});
        }
        return !result.error;
    }, [selectedIds, intl.locale, teammateNameDisplay, serverUrl]);

    const createGroupChannel = useCallback(async (ids: string[]): Promise<boolean> => {
        const result = await makeGroupChannel(serverUrl, ids);
        if (result.error) {
            alertErrorWithFallback(intl, result.error, messages.gm);
        }
        return !result.error;
    }, [serverUrl]);

    const onButtonTap = useCallback(async (selectedId?: {[id: string]: boolean}) => {
        const idsToUse = selectedId ? Object.keys(selectedId) : Object.keys(selectedIds);
        if (idsToUse.length > 1) {
            return createGroupChannel(idsToUse);
        }
        return createDirectChannel(idsToUse[0]);
    }, [selectedIds, createGroupChannel, createDirectChannel]);

    const handleSelectProfile = useCallback((user: UserProfile) => {
        if (selectedIds[user.id]) {
            handleRemoveProfile(user.id);
            return;
        }

        if (user.id === currentUserId) {
            const selectedId = {[currentUserId]: true};
            onButtonTap(selectedId);
        } else {
            const wasSelected = selectedIds[user.id];
            if (!wasSelected && selectedCount >= General.MAX_USERS_IN_GM) {
                return;
            }

            const newSelectedIds = Object.assign({}, selectedIds);
            if (!wasSelected) {
                newSelectedIds[user.id] = user;
            }

            setSelectedIds(newSelectedIds);
            clearSearch();
        }
    }, [clearSearch, currentUserId, handleRemoveProfile, onButtonTap, selectedIds, setSelectedIds]);

    const searchUsers = useCallback(async (searchTerm: string) => {
        const lowerCasedTerm = searchTerm.toLowerCase();
        setLoading(true);
        let results;

        if (restrictDirectMessage) {
            results = await searchProfiles(serverUrl, lowerCasedTerm, {team_id: currentTeamId, allow_inactive: true});
        } else {
            results = await searchProfiles(serverUrl, lowerCasedTerm, {allow_inactive: true});
        }

        let data: UserProfile[] = [];
        if (results.data) {
            data = results.data;
        }

        setSearchResults(data);
        setLoading(false);
    }, [restrictDirectMessage, serverUrl, currentTeamId]);

    const search = useCallback(() => {
        searchUsers(term);
    }, [searchUsers, term]);

    const onSearch = useCallback((text: string) => {
        if (text) {
            setTerm(text);
            if (searchTimeoutId.current) {
                clearTimeout(searchTimeoutId.current);
            }

            searchTimeoutId.current = setTimeout(() => {
                searchUsers(text);
            }, General.SEARCH_TIMEOUT_MILLISECONDS);
        } else {
            clearSearch();
        }
    }, [clearSearch, searchUsers]);

    return (
        <SafeAreaView
            style={style.container}
            testID='members_modal.screen'
        >
            <View style={style.searchBar}>
                <Search
                    autoCapitalize='none'
                    cancelButtonTitle={intl.formatMessage({id: 'mobile.post.cancel', defaultMessage: 'Cancel'})}
                    keyboardAppearance={getKeyboardAppearanceFromTheme(theme)}
                    onCancel={clearSearch}
                    onChangeText={onSearch}
                    onSubmitEditing={search}
                    placeholder={intl.formatMessage({id: 'search_bar.search', defaultMessage: 'Search'})}
                    placeholderTextColor={changeOpacity(theme.centerChannelColor, 0.5)}
                    testID='members_modal.search_bar'
                    value={term}
                />
            </View>
            <UsersModal
                page={page}
                buttonText={messages.button}
                componentId={componentId}
                currentUserId={currentUserId}
                getProfiles={getProfiles}
                handleRemoveProfile={handleRemoveProfile}
                handleSelectProfile={handleSelectProfile}
                loading={loading}
                maxSelectedUsers={General.MAX_USERS_IN_GM}
                onButtonTap={onButtonTap}
                searchResults={searchResults}
                selectedIds={selectedIds}
                setLoading={setLoading}
                teammateNameDisplay={teammateNameDisplay}
                term={term}
            />
        </SafeAreaView>
    );
}
