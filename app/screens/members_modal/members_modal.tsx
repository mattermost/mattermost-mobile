// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {Keyboard, Platform, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import Loading from '@components/loading';
import Search from '@components/search';
import {General} from '@constants';
import {useTheme} from '@context/theme';
import useNavButtonPressed from '@hooks/navigation_button_pressed';
import SelectedUsers from '@screens/members_modal/selected_users';
import UserList from '@screens/members_modal/user_list';
import {dismissModal} from '@screens/navigation';
import {changeOpacity, getKeyboardAppearanceFromTheme, makeStyleSheetFromTheme} from '@utils/theme';
import {filterProfilesMatchingTerm} from '@utils/user';

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            flex: 1,
        },
        searchBar: {
            marginLeft: 12,
            marginRight: Platform.select({ios: 4, default: 12}),
            marginVertical: 12,
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
    };
});

const START_BUTTON = 'start-conversation';
const CLOSE_BUTTON = 'close-dms';

const close = () => {
    Keyboard.dismiss();
    dismissModal();
};

type searchFuncError = {
    data?: undefined;
    error: unknown;
}

type searchFuncSuccess = {
    data: UserProfile[];
    error?: undefined;
}

type Props = {
    componentId: string;
    currentUserId: string;
    getProfiles: () => void;
    loading: boolean;
    page: React.RefObject<any>;
    profiles: UserProfile[];
    searchUsersFunc: (searchTerm: string) => Promise<searchFuncError | searchFuncSuccess>;
    selectedIds: {[id: string]: UserProfile};
    setLoading: (v: boolean) => void;
    setSelectedIds: (ids: {[id: string]: UserProfile}) => void;
    setStartingConversation: (v: boolean) => void;
    setTerm: (term: string) => void;
    startConversationFunc: (selectedId?: {[id: string]: boolean}) => Promise<boolean>;
    startingConversation: boolean;
    teammateNameDisplay: string;
    term: string;
    tutorialWatched: boolean;
}

export default function MembersModal({
    componentId,
    currentUserId,
    getProfiles,
    loading,
    page,
    profiles,
    searchUsersFunc,
    selectedIds,
    setLoading,
    setSelectedIds,
    setStartingConversation,
    setTerm,
    startConversationFunc,
    startingConversation,
    teammateNameDisplay,
    term,
    tutorialWatched,
}: Props) {
    const theme = useTheme();
    const style = getStyleFromTheme(theme);
    const {formatMessage} = useIntl();

    const selectedCount = Object.keys(selectedIds).length;

    const isSearch = Boolean(term);
    const searchTimeoutId = useRef<NodeJS.Timeout | null>(null);
    const [searchResults, setSearchResults] = useState<UserProfile[]>([]);

    // the search profiles function used to update the user list
    const searchUsers = useCallback(async (searchTerm: string) => {
        setLoading(true);

        const results = await searchUsersFunc(searchTerm);

        let data: UserProfile[] = [];
        if (results.data) {
            data = results.data;
        }

        setSearchResults(data);
        setLoading(false);
    }, [searchUsersFunc]);

    // the action to take when clicking the start button
    const startConversation = useCallback(async (selectedId?: {[id: string]: boolean}) => {
        if (startingConversation) {
            return;
        }

        setStartingConversation(true);

        const idsToUse = selectedId ? Object.keys(selectedId) : Object.keys(selectedIds);
        let success;
        if (idsToUse.length === 0) {
            success = false;
        } else {
            success = await startConversationFunc();
        }

        if (success) {
            close();
        } else {
            setStartingConversation(false);
        }
    }, [startingConversation, selectedIds, startConversationFunc]);

    useNavButtonPressed(START_BUTTON, componentId, startConversation, [startConversation]);
    useNavButtonPressed(CLOSE_BUTTON, componentId, close, [close]);

    const handleRemoveProfile = useCallback((id: string) => {
        const newSelectedIds = Object.assign({}, selectedIds);

        Reflect.deleteProperty(newSelectedIds, id);

        setSelectedIds(newSelectedIds);
    }, [selectedIds]);

    const search = useCallback(() => {
        searchUsers(term);
    }, [searchUsers, term]);

    const clearSearch = useCallback(() => {
        setTerm('');
        setSearchResults([]);
    }, []);

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
    }, [searchUsers, clearSearch]);

    const handleSelectProfile = useCallback((user: UserProfile) => {
        if (selectedIds[user.id]) {
            handleRemoveProfile(user.id);
            return;
        }

        if (user.id === currentUserId) {
            const selectedId = {
                [currentUserId]: true,
            };

            startConversation(selectedId);
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
    }, [selectedIds, currentUserId, handleRemoveProfile, startConversation, clearSearch]);

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

    const handleOnSubmitEditing = useCallback(() => {
        search();
    }, [search]);

    const handleOnCancel = useCallback(() => {
        clearSearch();
    }, [clearSearch]);

    if (startingConversation) {
        return (
            <View style={style.container}>
                <Loading color={theme.centerChannelColor}/>
            </View>
        );
    }

    return (
        <SafeAreaView
            style={style.container}
            testID='members_modal.screen'
        >
            <View style={style.searchBar}>
                <Search
                    testID='members_modal.search_bar'
                    placeholder={formatMessage({id: 'search_bar.search', defaultMessage: 'Search'})}
                    cancelButtonTitle={formatMessage({id: 'mobile.post.cancel', defaultMessage: 'Cancel'})}
                    placeholderTextColor={changeOpacity(theme.centerChannelColor, 0.5)}
                    onChangeText={onSearch}
                    onSubmitEditing={handleOnSubmitEditing}
                    onCancel={handleOnCancel}
                    autoCapitalize='none'
                    keyboardAppearance={getKeyboardAppearanceFromTheme(theme)}
                    value={term}
                />
            </View>
            {selectedCount > 0 &&
            <SelectedUsers
                selectedIds={selectedIds}
                warnCount={General.MAX_USERS_IN_GM - 2}
                maxCount={General.MAX_USERS_IN_GM}
                onRemove={handleRemoveProfile}
                teammateNameDisplay={teammateNameDisplay}
            />
            }
            <UserList
                currentUserId={currentUserId}
                handleSelectProfile={handleSelectProfile}
                loading={loading}
                profiles={data}
                selectedIds={selectedIds}
                showNoResults={!loading && page.current !== -1}
                teammateNameDisplay={teammateNameDisplay}
                fetchMore={getProfiles}
                term={term}
                testID='members_modal.user_list'
                tutorialWatched={tutorialWatched}
            />
        </SafeAreaView>
    );
}
