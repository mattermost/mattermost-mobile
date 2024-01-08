// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useRef, useState, type ComponentProps} from 'react';

import UserList from '@components/user_list';
import {General} from '@constants';
import {useServerUrl} from '@context/server';
import {debounce} from '@helpers/api/general';
import {filterProfilesMatchingTerm} from '@utils/user';

import type {GroupModel} from '@app/database/models/server';

type TGroup = Group | GroupModel;

type Props = {
    currentUserId: string;
    tutorialWatched: boolean;
    handleSelectProfile?: (user: UserProfile) => void;
    handleSelectGroup?: (group: TGroup) => void;
    forceFetchProfile?: boolean;
    term: string;
    flatten?: boolean;
    includeUserMargin?: boolean;
    selectedIds?: {[id: string]: UserProfile | TGroup | false};
    selectionLimit?: number;
    fetchFunction: (page: number) => Promise<UserProfile[] | {profiles?: UserProfile[]; groups?: TGroup[]}>;
    searchFunction: (term: string) => Promise<UserProfile[] | {profiles?: UserProfile[]; groups?: TGroup[]}>;
    createFilter?: (exactMatches: UserProfile[], term: string) => ((p: UserProfile) => boolean);
    testID: string;
    spacing?: ComponentProps<typeof UserList>['spacing'];
    inBottomSheet?: boolean;
}

export default function ServerUserList({
    currentUserId,
    tutorialWatched,
    handleSelectProfile,
    handleSelectGroup,
    forceFetchProfile,
    flatten,
    term,
    selectedIds,
    selectionLimit,
    fetchFunction,
    searchFunction,
    createFilter,
    testID,
    spacing,
    inBottomSheet,
}: Props) {
    const serverUrl = useServerUrl();

    const searchTimeoutId = useRef<NodeJS.Timeout | null>(null);
    const next = useRef(true);
    const page = useRef(-1);
    const mounted = useRef(false);

    const [profiles, setProfiles] = useState<UserProfile[]>([]);
    const [groups] = useState<TGroup[]>([]);
    const [profileResults, setProfileResults] = useState<UserProfile[]>([]);
    const [groupResults, setGroupResults] = useState<TGroup[]>([]);
    const [loading, setLoading] = useState(false);

    const isSearch = Boolean(term);

    const loadedProfiles = (data: UserProfile[]) => {
        const users = data;
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

    const search = useCallback(async (searchTerm: string) => {
        setLoading(true);
        const data = await searchFunction(searchTerm);
        if (Array.isArray(data)) {
            setProfileResults(data);
        } else {
            if (data.profiles) {
                setProfileResults(data.profiles);
            }
            if (data.groups) {
                setGroupResults(data.groups);
            }
        }
        setLoading(false);
    }, [serverUrl, searchFunction]);

    useEffect(() => {
        if (term) {
            if (searchTimeoutId.current) {
                clearTimeout(searchTimeoutId.current);
            }

            searchTimeoutId.current = setTimeout(() => {
                search(term);
            }, General.SEARCH_TIMEOUT_MILLISECONDS);
        } else {
            setProfileResults([]);
            setGroupResults([]);
        }
    }, [term]);

    useEffect(() => {
        mounted.current = true;
        getProfiles();
        return () => {
            mounted.current = false;
        };
    }, []);

    const {profileData, groupData} = useMemo(() => {
        let p = profiles;
        let g = groups;

        if (isSearch) {
            const exactMatches: UserProfile[] = [];
            const profilesToFilter = profileResults.length ? profileResults : profiles;
            let results = filterProfilesMatchingTerm(profilesToFilter, term);

            const filterByTerm = createFilter?.(exactMatches, term);
            if (filterByTerm) {
                results = results.filter(filterByTerm);
            }

            p = [...exactMatches, ...results];
            g = groupResults;
        }
        return {profileData: p, groupData: g};
    }, [term, isSearch, isSearch && profileResults, isSearch && groupResults, profiles, groups]);

    return (
        <UserList
            currentUserId={currentUserId}
            handleSelectProfile={handleSelectProfile}
            handleSelectGroup={handleSelectGroup}
            loading={loading}
            profiles={profileData}
            groups={groupData}
            selectedIds={selectedIds}
            showNoResults={!loading && page.current !== -1}
            fetchMore={getProfiles}
            term={term}
            testID={testID}
            tutorialWatched={tutorialWatched}
            forceFetchProfile={forceFetchProfile}
            flatten={flatten}
            spacing={spacing}
            inBottomSheet={inBottomSheet}
            selectionLimit={selectionLimit}
        />
    );
}
