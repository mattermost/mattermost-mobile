// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useReducer, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {Keyboard, Platform, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {fetchProfiles, fetchProfilesInTeam, searchProfiles} from '@actions/remote/user';
import CompassIcon from '@components/compass_icon';
import Loading from '@components/loading';
import Search from '@components/search';
import {General} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {debounce} from '@helpers/api/general';
import useNavButtonPressed from '@hooks/navigation_button_pressed';
import {dismissModal, setButtons} from '@screens/navigation';
import {changeOpacity, getKeyboardAppearanceFromTheme, makeStyleSheetFromTheme} from '@utils/theme';
import {filterProfilesMatchingTerm} from '@utils/user';

import SelectedUsers from './selected_users';
import UserList from './user_list';

const CLOSE_BUTTON = 'close-dms';

type Props = {
    componentId: string;
    currentTeamId: string;
    currentUserId: string;
    restrictDirectMessage: boolean;
    selectUsersButtonIcon: string;
    selectUsersButtonText: string;
    selectUsersMax: number;
    selectUsersWarn: number;
    selectedIds: {[id: string]: UserProfile};
    setSelectedIds: (ids: {[id: string]: UserProfile}) => void;
    startConversation: (selectedId?: {[id: string]: boolean}) => void;
    startingConversation: boolean;
    teammateNameDisplay: string;
    tutorialWatched: boolean;
}

const close = () => {
    Keyboard.dismiss();
    dismissModal();
};

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

function reduceProfiles(state: UserProfile[], action: {type: 'add'; values?: UserProfile[]}) {
    if (action.type === 'add' && action.values?.length) {
        return [...state, ...action.values];
    }
    return state;
}

export default function MembersModal({
    componentId,
    currentTeamId,
    currentUserId,
    selectUsersMax,
    selectUsersWarn,
    restrictDirectMessage,
    selectUsersButtonIcon,
    selectUsersButtonText,
    selectedIds,
    setSelectedIds,
    startConversation,
    startingConversation,
    teammateNameDisplay,
    tutorialWatched,
}: Props) {
    const serverUrl = useServerUrl();
    const theme = useTheme();
    const style = getStyleFromTheme(theme);
    const intl = useIntl();
    const {formatMessage} = intl;

    const searchTimeoutId = useRef<NodeJS.Timeout | null>(null);
    const next = useRef(true);
    const page = useRef(-1);
    const mounted = useRef(false);

    const [profiles, dispatchProfiles] = useReducer(reduceProfiles, []);
    const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(false);
    const [term, setTerm] = useState('');

    const selectedCount = Object.keys(selectedIds).length;

    const isSearch = Boolean(term);

    const loadedProfiles = ({users}: {users?: UserProfile[]}) => {
        if (mounted.current) {
            if (users && !users.length) {
                next.current = false;
            }

            page.current += 1;
            setLoading(false);
            dispatchProfiles({type: 'add', values: users});
        }
    };

    const clearSearch = useCallback(() => {
        setTerm('');
        setSearchResults([]);
    }, []);

    const getProfiles = useCallback(debounce(() => {
        if (next.current && !loading && !term && mounted.current) {
            setLoading(true);
            if (restrictDirectMessage) {
                fetchProfilesInTeam(serverUrl, currentTeamId, page.current + 1, General.PROFILE_CHUNK_SIZE).then(loadedProfiles);
            } else {
                fetchProfiles(serverUrl, page.current + 1, General.PROFILE_CHUNK_SIZE).then(loadedProfiles);
            }
        }
    }, 100), [loading, isSearch, restrictDirectMessage, serverUrl, currentTeamId]);

    const handleRemoveProfile = useCallback((id: string) => {
        const newSelectedIds = Object.assign({}, selectedIds);

        Reflect.deleteProperty(newSelectedIds, id);

        setSelectedIds(newSelectedIds);
    }, [selectedIds]);

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

            if (!wasSelected && selectedCount >= General.MAX_USERS_IN_GM - 1) {
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
    }, [searchUsers, clearSearch]);

    const updateNavigationButtons = useCallback(async () => {
        const closeIcon = await CompassIcon.getImageSource('close', 24, theme.sidebarHeaderTextColor);
        setButtons(componentId, {
            leftButtons: [{
                id: CLOSE_BUTTON,
                icon: closeIcon,
                testID: 'close.button',
            }],
        });
    }, [intl.locale, theme]);

    useNavButtonPressed(CLOSE_BUTTON, componentId, close, [close]);

    useEffect(() => {
        mounted.current = true;
        updateNavigationButtons();
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
            testID='members.screen'
        >
            <View style={style.searchBar}>
                <Search
                    testID='search_bar'
                    placeholder={formatMessage({id: 'search_bar.search', defaultMessage: 'Search'})}
                    cancelButtonTitle={formatMessage({id: 'mobile.post.cancel', defaultMessage: 'Cancel'})}
                    placeholderTextColor={changeOpacity(theme.centerChannelColor, 0.5)}
                    onChangeText={onSearch}
                    onSubmitEditing={search}
                    onCancel={clearSearch}
                    autoCapitalize='none'
                    keyboardAppearance={getKeyboardAppearanceFromTheme(theme)}
                    value={term}
                />
            </View>
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
                testID='user_list'
                tutorialWatched={tutorialWatched}
            />
            {selectedCount > 0 &&
            <SelectedUsers
                selectedIds={selectedIds}
                warnCount={selectUsersWarn}
                maxCount={selectUsersMax}
                onRemove={handleRemoveProfile}
                teammateNameDisplay={teammateNameDisplay}
                onPress={startConversation}
                buttonIcon={selectUsersButtonIcon}
                buttonText={selectUsersButtonText}
            />
            }
        </SafeAreaView>
    );
}

