// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';

import {fetchProfiles, searchProfiles} from '@actions/remote/user';
import UserList from '@components/user_list';
import {General} from '@constants';
import {useServerUrl} from '@context/server';
import {debounce} from '@helpers/api/general';
import {filterProfilesMatchingTerm} from '@utils/user';

type Props = {
    currentTeamId: string;
    currentUserId: string;
    teammateNameDisplay: string;
    tutorialWatched: boolean;
    handleSelectProfile: (user: UserProfile) => void;
    term: string;
}

function handleIdSelection(currentIds: {[id: string]: UserProfile}, user: UserProfile) {
    const newSelectedIds = {...currentIds};
    const wasSelected = currentIds[user.id];

    if (wasSelected) {
        Reflect.deleteProperty(newSelectedIds, user.id);
    } else {
        newSelectedIds[user.id] = user;
    }

    return newSelectedIds;
}

export default function ServerUserList({
    currentTeamId,
    currentUserId,
    teammateNameDisplay,
    tutorialWatched,
    handleSelectProfile,
    term,
}: Props) {
    const serverUrl = useServerUrl();

    const next = useRef(true);
    const page = useRef(-1);
    const mounted = useRef(false);

    const [profiles, setProfiles] = useState<UserProfile[]>([]);
    const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedIds, setSelectedIds] = useState<{[id: string]: UserProfile}>({});
    const selectedCount = Object.keys(selectedIds).length;

    const isSearch = Boolean(term);

    const loadedProfiles = ({users}: {users?: UserProfile[]}) => {
        if (mounted.current) {
            if (users && !users.length) {
                next.current = false;
            }

            page.current += 1;
            setLoading(false);
            setProfiles((current) => {
                if (users?.length) {
                    return [...current, ...users];
                }

                return current;
            });
        }
    };

    const getProfiles = useCallback(debounce(() => {
        if (next.current && !loading && !term && mounted.current) {
            setLoading(true);
            fetchProfiles(serverUrl, page.current + 1, General.PROFILE_CHUNK_SIZE).then(loadedProfiles);
        }
    }, 100), [loading, isSearch, serverUrl, currentTeamId]);

    const onHandleSelectProfile = useCallback((user: UserProfile) => {
        handleSelectProfile(user);
        setSelectedIds((current) => handleIdSelection(current, user));
    }, [handleSelectProfile]);

    const searchUsers = useCallback(async (searchTerm: string) => {
        const lowerCasedTerm = searchTerm.toLowerCase();
        setLoading(true);
        const results = await searchProfiles(serverUrl, lowerCasedTerm, {allow_inactive: true});

        let data: UserProfile[] = [];
        if (results.data) {
            data = results.data;
        }

        setSearchResults(data);
        setLoading(false);
    }, [serverUrl, currentTeamId]);

    useEffect(() => {
        searchUsers(term);
    }, [term]);

    useEffect(() => {
        mounted.current = true;
        getProfiles();
        return () => {
            mounted.current = false;
        };
    }, []);

    const data = useMemo(() => {
        if (term) {
            const exactMatches: UserProfile[] = [];
            const filterByTerm = (p: UserProfile) => {
                if (selectedCount > 0 && p.id === currentUserId) {
                    return false;
                }

                if (p.username === term || p.username.startsWith(term)) {
                    exactMatches.push(p);
                    return false;
                }

                return true;
            };

            const results = filterProfilesMatchingTerm(searchResults, term).filter(filterByTerm);
            return [...exactMatches, ...results];
        }
        return profiles;
    }, [term, isSearch && selectedCount, isSearch && searchResults, profiles]);

    return (
        <UserList
            currentUserId={currentUserId}
            handleSelectProfile={onHandleSelectProfile}
            loading={loading}
            profiles={data}
            selectedIds={selectedIds}
            showNoResults={!loading && page.current !== -1}
            teammateNameDisplay={teammateNameDisplay}
            fetchMore={getProfiles}
            term={term}
            testID='create_direct_message.user_list'
            tutorialWatched={tutorialWatched}
        />
    );
}
