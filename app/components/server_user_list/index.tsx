// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';

import UserList from '@components/user_list';
import {General} from '@constants';
import {useServerUrl} from '@context/server';
import {debounce} from '@helpers/api/general';
import {filterProfilesMatchingTerm} from '@utils/user';

type Props = {
    currentUserId: string;
    tutorialWatched: boolean;
    handleSelectProfile: (user: UserProfile) => void;
    term: string;
    selectedIds: {[id: string]: UserProfile};
    fetchFunction: (page: number) => Promise<UserProfile[]>;
    searchFunction: (term: string) => Promise<UserProfile[]>;
    createFilter: (exactMatches: UserProfile[], term: string) => ((p: UserProfile) => boolean);
    testID: string;
}

export default function ServerUserList({
    currentUserId,
    tutorialWatched,
    handleSelectProfile,
    term,
    selectedIds,
    fetchFunction,
    searchFunction,
    createFilter,
    testID,
}: Props) {
    const serverUrl = useServerUrl();

    const searchTimeoutId = useRef<NodeJS.Timeout | null>(null);
    const next = useRef(true);
    const page = useRef(-1);
    const mounted = useRef(false);

    const [profiles, setProfiles] = useState<UserProfile[]>([]);
    const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(false);

    const isSearch = Boolean(term);

    const loadedProfiles = (users: UserProfile[]) => {
        if (mounted.current) {
            if (!users.length) {
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
            fetchFunction(page.current + 1).then(loadedProfiles);
        }
    }, 100), [loading, isSearch, serverUrl]);

    const searchUsers = useCallback(async (searchTerm: string) => {
        setLoading(true);
        const data = await searchFunction(searchTerm);
        setSearchResults(data);
        setLoading(false);
    }, [serverUrl, searchFunction]);

    useEffect(() => {
        if (term) {
            if (searchTimeoutId.current) {
                clearTimeout(searchTimeoutId.current);
            }

            searchTimeoutId.current = setTimeout(() => {
                searchUsers(term);
            }, General.SEARCH_TIMEOUT_MILLISECONDS);
        } else {
            setSearchResults([]);
        }
    }, [term]);

    useEffect(() => {
        mounted.current = true;
        getProfiles();
        return () => {
            mounted.current = false;
        };
    }, []);

    const data = useMemo(() => {
        if (isSearch) {
            const exactMatches: UserProfile[] = [];
            const filterByTerm = createFilter(exactMatches, term);

            const profilesToFilter = searchResults.length ? searchResults : profiles;
            const results = filterProfilesMatchingTerm(profilesToFilter, term).filter(filterByTerm);
            return [...exactMatches, ...results];
        }
        return profiles;
    }, [term, isSearch, isSearch && searchResults, profiles]);

    return (
        <UserList
            currentUserId={currentUserId}
            handleSelectProfile={handleSelectProfile}
            loading={loading}
            profiles={data}
            selectedIds={selectedIds}
            showNoResults={!loading && page.current !== -1}
            fetchMore={getProfiles}
            term={term}
            testID={testID}
            tutorialWatched={tutorialWatched}
            includeUserMargin={true}
        />
    );
}
