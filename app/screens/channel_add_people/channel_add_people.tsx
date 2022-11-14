// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useRef, useState} from 'react';
import {defineMessages, useIntl} from 'react-intl';
import {Platform, SafeAreaView, StyleSheet, View} from 'react-native';

import {addMembersToChannel} from '@actions/remote/channel';
import {fetchProfilesNotInChannel, searchProfiles} from '@actions/remote/user';
import Search from '@components/search';
import UsersModal from '@components/users_modal';
import {General} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {ChannelModel} from '@database/models/server';
import {t} from '@i18n';
import {alertErrorWithFallback} from '@utils/draft';
import {changeOpacity, getKeyboardAppearanceFromTheme} from '@utils/theme';

// import {displayUsername} from '@utils/user';

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
    add_people: {
        id: t('mobile.add_people.error'),
        defaultMessage: "We couldn't add those users to the channel. Please check your connection and try again.",
    },
    button: {
        id: t('mobile.channel_add_people.title'),
        defaultMessage: 'Add Members',
    },
});

type Props = {
    componentId: string;
    currentChannel: ChannelModel;
    currentTeamId: string;
    currentUserId: string;
    teammateNameDisplay: string;
}

export default function ChannelAddPeople({
    componentId,
    currentChannel,
    currentTeamId,
    currentUserId,
    teammateNameDisplay,
}: Props) {
    const serverUrl = useServerUrl();
    const intl = useIntl();
    const theme = useTheme();

    const [loading, setLoading] = useState(false);
    const [selectedIds, setSelectedIds] = useState<{[id: string]: UserProfile}>({});
    const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
    const [term, setTerm] = useState('');

    const pageRef = useRef<number>(-1);
    const searchTimeoutId = useRef<NodeJS.Timeout | null>(null);

    const groupConstrained = currentChannel.isGroupConstrained;
    const currentChannelId = currentChannel.id;

    const getProfiles = useCallback(async () => {
        return fetchProfilesNotInChannel(serverUrl, currentTeamId, currentChannelId, groupConstrained, pageRef.current + 1, General.PROFILE_CHUNK_SIZE);
    }, [serverUrl, currentTeamId]);

    const onButtonTap = useCallback(async (selectedId?: {[id: string]: boolean}) => {
        const idsToUse = selectedId ? Object.keys(selectedId) : Object.keys(selectedIds);
        const result = await addMembersToChannel(serverUrl, currentChannelId, idsToUse, '', false);

        if (result.error) {
            alertErrorWithFallback(intl, result.error, messages.add_people);
        }
        return !result.error;
    }, [selectedIds]);

    const searchUsers = useCallback(async (searchTerm: string) => {
        const lowerCasedTerm = searchTerm.toLowerCase();
        return searchProfiles(serverUrl, lowerCasedTerm, {channel_id: currentChannelId, allow_inactive: true});
    }, [serverUrl, currentTeamId]);

    const handleSearchUsers = useCallback(async (searchTerm: string) => {
        setLoading(true);

        const results = await searchUsers(searchTerm);

        setSearchResults(results?.data || []);
        setLoading(false);
    }, [searchUsers]);

    const search = useCallback(() => {
        handleSearchUsers(term);
    }, [handleSearchUsers, term]);

    const clearSearch = useCallback(() => {
        setTerm('');
        setSearchResults([]);
    }, []);

    // search only users not in channel
    const onSearch = useCallback((text: string) => {
        if (text) {
            setTerm(text);
            if (searchTimeoutId.current) {
                clearTimeout(searchTimeoutId.current);
            }

            searchTimeoutId.current = setTimeout(() => {
                handleSearchUsers(text);
            }, General.SEARCH_TIMEOUT_MILLISECONDS);
            return;
        }

        clearSearch();
    }, [clearSearch, handleSearchUsers]);

    return (
        <SafeAreaView
            style={style.container}
            testID='members_modal.screen'
        >
            <View style={style.searchBar}>
                <Search
                    testID='members_modal.search_bar'
                    placeholder={intl.formatMessage({id: 'search_bar.search', defaultMessage: 'Search'})}
                    cancelButtonTitle={intl.formatMessage({id: 'mobile.post.cancel', defaultMessage: 'Cancel'})}
                    placeholderTextColor={changeOpacity(theme.centerChannelColor, 0.5)}
                    onChangeText={onSearch}
                    onSubmitEditing={search}
                    onCancel={clearSearch}
                    autoCapitalize='none'
                    keyboardAppearance={getKeyboardAppearanceFromTheme(theme)}
                    value={term}
                />
            </View>
            <UsersModal
                ref={pageRef}
                term={term}
                clearSearch={clearSearch}
                buttonText={messages.button}
                componentId={componentId}
                currentUserId={currentUserId}
                getProfiles={getProfiles}
                maxSelectedUsers={General.MAX_USERS_IN_GM}
                loading={loading}
                setLoading={setLoading}
                searchResults={searchResults}
                selectedIds={selectedIds}
                setSelectedIds={setSelectedIds}
                teammateNameDisplay={teammateNameDisplay}
                onButtonTap={onButtonTap}
            />
        </SafeAreaView>
    );
}

