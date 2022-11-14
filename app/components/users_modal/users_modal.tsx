// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {forwardRef, MutableRefObject, useCallback, useEffect, useMemo, useReducer, useRef, useState} from 'react';
import {MessageDescriptor, useIntl} from 'react-intl';
import {Keyboard, Platform, StyleSheet, View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import Loading from '@components/loading';
import SelectedUsersPanel from '@components/selected_users_panel';
import UserList from '@components/user_list';
import {useTheme} from '@context/theme';
import {debounce} from '@helpers/api/general';
import useNavButtonPressed from '@hooks/navigation_button_pressed';
import {dismissModal, setButtons} from '@screens/navigation';
import {filterProfilesMatchingTerm} from '@utils/user';

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

const ACTION_BUTTON = 'action-button';
const CLOSE_BUTTON = 'close-dms';

const close = () => {
    Keyboard.dismiss();
    dismissModal();
};

type getProfilesError = {
    users?: undefined;
    error: unknown;
}

type getProfilesSuccess = {
    users: UserProfile[];
    error?: undefined;
}

type Props = {
    buttonText: MessageDescriptor;
    clearSearch: () => void;
    componentId: string;
    currentUserId: string;
    getProfiles: () => Promise<getProfilesSuccess | getProfilesError>;
    loading: boolean;
    maxSelectedUsers: number;
    onButtonTap: (selectedId?: {[id: string]: boolean}) => Promise<boolean>;
    searchResults: UserProfile[];
    selectedIds: {[id: string]: UserProfile};
    setLoading: (loading: boolean) => void;
    setSelectedIds: (ids: {[id: string]: UserProfile}) => void;
    teammateNameDisplay: string;
    term: string;
    tutorialWatched: boolean;
}

function reduceProfiles(state: UserProfile[], action: {type: 'add'; values?: UserProfile[]}) {
    if (action.type === 'add' && action.values?.length) {
        return [...state, ...action.values];
    }
    return state;
}

const UsersModal = forwardRef(({
    buttonText,
    clearSearch,
    componentId,
    currentUserId,
    getProfiles,
    loading,
    maxSelectedUsers,
    onButtonTap,
    searchResults,
    selectedIds,
    setLoading,
    setSelectedIds,
    teammateNameDisplay,
    term,
    tutorialWatched,
}: Props, pageRef: MutableRefObject<number>) => {
    const theme = useTheme();
    const {formatMessage, locale} = useIntl();
    const mounted = useRef(false);
    const next = useRef(true);

    const selectedCount = useMemo(() => Object.keys(selectedIds).length, [selectedIds]);

    const [startingButtonAction, setStartingButtonAction] = useState(false);
    const [profiles, dispatchProfiles] = useReducer(reduceProfiles, []);

    const isSearch = Boolean(term);

    let hasUsers = false;
    if (pageRef != null && typeof pageRef !== 'function') {
        hasUsers = pageRef?.current !== -1;
    }

    const loadedProfiles = useCallback(({users}: {users?: UserProfile[]}) => {
        if (mounted.current) {
            if (users && !users.length) {
                next.current = false;
            }

            if (pageRef != null && typeof pageRef !== 'function') {
                pageRef.current += 1;
            }
            setLoading(false);
            dispatchProfiles({type: 'add', values: users});
        }
    }, []);

    const handleButtonTap = useCallback(async (selectedId?: {[id: string]: boolean}) => {
        if (startingButtonAction) {
            return;
        }

        setStartingButtonAction(true);

        const idsToUse = selectedId ? Object.keys(selectedId) : Object.keys(selectedIds);
        const success = idsToUse.length === 0 ? false : await onButtonTap();

        if (success) {
            close();
            return;
        }

        setStartingButtonAction(false);
    }, [onButtonTap, selectedIds, startingButtonAction]);

    const handleGetProfiles = useCallback(debounce(() => {
        if (next.current && !loading && !term && mounted.current) {
            setLoading(true);
            getProfiles().then(loadedProfiles);
        }
    }, 100), [getProfiles, loading, term]);

    const handleRemoveProfile = useCallback((id: string) => {
        const newSelectedIds = Object.assign({}, selectedIds);

        Reflect.deleteProperty(newSelectedIds, id);

        setSelectedIds(newSelectedIds);
    }, [selectedIds, setSelectedIds]);

    const handleSelectProfile = useCallback((user: UserProfile) => {
        // console.log('selectedIds', selectedIds);
        if (selectedIds[user.id]) {
            handleRemoveProfile(user.id);
            return;
        }

        if (user.id === currentUserId) {
            const selectedId = {[currentUserId]: true};
            handleButtonTap(selectedId);
            return;
        }

        const wasSelected = selectedIds[user.id];
        if (!wasSelected && selectedCount >= maxSelectedUsers) {
            return;
        }

        const newSelectedIds = Object.assign({}, selectedIds);

        // console.log('newSelectedIds', newSelectedIds);
        if (!wasSelected) {
            newSelectedIds[user.id] = user;
        }

        setSelectedIds(newSelectedIds);
        clearSearch();
    }, [clearSearch, currentUserId, handleRemoveProfile, handleButtonTap, selectedIds, setSelectedIds]);

    const data = useMemo(() => {
        if (isSearch) {
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
    }, [isSearch && selectedCount, isSearch && searchResults, profiles, term]);

    const updateNavigationButtons = useCallback(async (startEnabled: boolean) => {
        const closeIcon = await CompassIcon.getImageSource('close', 24, theme.sidebarHeaderTextColor);
        setButtons(componentId, {
            leftButtons: [{
                id: CLOSE_BUTTON,
                icon: closeIcon,
                testID: 'close.button',
            }],
            rightButtons: [{
                color: theme.sidebarHeaderTextColor,
                id: ACTION_BUTTON,
                text: formatMessage(buttonText),
                showAsAction: 'always',
                enabled: startEnabled,
                testID: 'action.button',
            }],
        });
    }, [buttonText, locale, theme]);

    useEffect(() => {
        mounted.current = true;
        updateNavigationButtons(false);
        handleGetProfiles();
        return () => {
            mounted.current = false;
        };
    }, []);

    useEffect(() => {
        const canStart = selectedCount > 0 && !startingButtonAction;
        updateNavigationButtons(canStart);
    }, [selectedCount > 0, startingButtonAction, updateNavigationButtons]);

    useNavButtonPressed(ACTION_BUTTON, componentId, handleButtonTap, [handleButtonTap]);
    useNavButtonPressed(CLOSE_BUTTON, componentId, close, [close]);

    if (startingButtonAction) {
        return (
            <View style={style.container}>
                <Loading color={theme.centerChannelColor}/>
            </View>
        );
    }

    return (
        <>
            {selectedCount > 0 &&
            <SelectedUsersPanel
                selectedIds={selectedIds}
                warnCount={maxSelectedUsers - 2}
                maxCount={maxSelectedUsers}
                onRemove={handleRemoveProfile}
                teammateNameDisplay={teammateNameDisplay}
            />
            }
            <UserList
                currentUserId={currentUserId}
                fetchMore={handleGetProfiles}
                handleSelectProfile={handleSelectProfile}
                loading={loading}
                profiles={data}
                selectedIds={selectedIds}
                showNoResults={!loading && hasUsers}
                teammateNameDisplay={teammateNameDisplay}
                term={term}
                testID='members_modal.user_list'
                tutorialWatched={tutorialWatched}
            />
        </>
    );
});

UsersModal.displayName = 'UsersModal';
export default UsersModal;
