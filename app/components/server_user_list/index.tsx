// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';

import UserList from '@components/user_list';
import {General} from '@constants';
import {useDebounce} from '@hooks/utils';
import {filterProfilesMatchingTerm} from '@utils/user';

import type {AvailableScreens} from '@typings/screens/navigation';
import type {SectionListData} from 'react-native';

type Props = {
    tutorialWatched: boolean;
    handleSelectProfile: (user: UserProfile) => void;
    term: string;
    selectedIds: Set<string>;
    fetchFunction: (page: number) => Promise<UserProfile[]>;
    searchFunction: (term: string) => Promise<UserProfile[]>;
    createFilter: (exactMatches: UserProfile[], term: string) => ((p: UserProfile) => boolean);
    testID: string;
    location: AvailableScreens;
    customSection?: (profiles: UserProfile[]) => Array<SectionListData<UserProfile>>;
}

export default function ServerUserList({
    tutorialWatched,
    handleSelectProfile,
    term,
    selectedIds,
    fetchFunction,
    searchFunction,
    createFilter,
    testID,
    location,
    customSection,
}: Props) {
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

    const getProfiles = useDebounce(useCallback(() => {
        if (next.current && !loading && !term && mounted.current) {
            setLoading(true);
            fetchFunction(page.current + 1).then(loadedProfiles);
        }
    }, [loading, term, fetchFunction]), 100);

    const searchUsers = useCallback(async (searchTerm: string) => {
        setLoading(true);
        const data = await searchFunction(searchTerm);
        setSearchResults(data);
        setLoading(false);
    }, [searchFunction]);

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

        // We only want to run the search when the term changes
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [term]);

    useEffect(() => {
        mounted.current = true;
        getProfiles();
        return () => {
            mounted.current = false;
        };

        // We only want to get the profiles on mount
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
    }, [isSearch, profiles, createFilter, term, searchResults]);

    return (
        <UserList
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
            location={location}
            customSection={customSection}
        />
    );
}
