// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useReducer, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {Keyboard, Platform, View} from 'react-native';
import {Navigation} from 'react-native-navigation';
import {SafeAreaView} from 'react-native-safe-area-context';

import {makeDirectChannel, makeGroupChannel} from '@actions/remote/channel';
import {fetchProfiles, fetchProfilesInTeam, searchProfiles} from '@actions/remote/user';
import CompassIcon from '@components/compass_icon';
import Loading from '@components/loading';
import Search from '@components/search';
import {General} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {debounce} from '@helpers/api/general';
import {t} from '@i18n';
import {dismissModal, setButtons} from '@screens/navigation';
import {alertErrorWithFallback} from '@utils/draft';
import {
    changeOpacity,
    makeStyleSheetFromTheme,
    getKeyboardAppearanceFromTheme,
} from '@utils/theme';
import {displayUsername, filterProfilesMatchingTerm} from '@utils/user';

import SelectedUsers from './selected_users';
import UserList from './user_list';

const START_BUTTON = 'start-conversation';
const CLOSE_BUTTON = 'close-dms';

type Props = {
    componentId: string;
    currentTeamId: string;
    currentUserId: string;
    restrictDirectMessage: boolean;
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

export default function CreateDirectMessage({
    componentId,
    currentTeamId,
    currentUserId,
    restrictDirectMessage,
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
    const [startingConversation, setStartingConversation] = useState(false);
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

    const createDirectChannel = useCallback(async (id: string): Promise<boolean> => {
        const user = selectedIds[id];

        const displayName = displayUsername(user, intl.locale, teammateNameDisplay);

        const result = await makeDirectChannel(serverUrl, id, displayName);

        if (result.error) {
            alertErrorWithFallback(
                intl,
                result.error,
                {
                    id: 'mobile.open_dm.error',
                    defaultMessage: "We couldn't open a direct message with {displayName}. Please check your connection and try again.",
                },
                {
                    displayName,
                },
            );
        }

        return !result.error;
    }, [selectedIds, intl.locale, teammateNameDisplay, serverUrl]);

    const createGroupChannel = useCallback(async (ids: string[]): Promise<boolean> => {
        const result = await makeGroupChannel(serverUrl, ids);

        if (result.error) {
            alertErrorWithFallback(
                intl,
                result.error,
                {
                    id: t('mobile.open_gm.error'),
                    defaultMessage: "We couldn't open a group message with those users. Please check your connection and try again.",
                },
            );
        }

        return !result.error;
    }, [serverUrl]);

    const startConversation = useCallback(async (selectedId?: {[id: string]: boolean}) => {
        if (startingConversation) {
            return;
        }

        setStartingConversation(true);

        const idsToUse = selectedId ? Object.keys(selectedId) : Object.keys(selectedIds);
        let success;
        if (idsToUse.length === 0) {
            success = false;
        } else if (idsToUse.length > 1) {
            success = await createGroupChannel(idsToUse);
        } else {
            success = await createDirectChannel(idsToUse[0]);
        }

        if (success) {
            close();
        } else {
            setStartingConversation(false);
        }
    }, [startingConversation, selectedIds, createGroupChannel, createDirectChannel]);

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

    const updateNavigationButtons = useCallback(async (startEnabled: boolean) => {
        const closeIcon = await CompassIcon.getImageSource('close', 24, theme.sidebarHeaderTextColor);
        setButtons(componentId, {
            leftButtons: [{
                id: CLOSE_BUTTON,
                icon: closeIcon,
                testID: 'close.create_direct_message.button',
            }],
            rightButtons: [{
                color: theme.sidebarHeaderTextColor,
                id: START_BUTTON,
                text: formatMessage({id: 'mobile.create_direct_message.start', defaultMessage: 'Start'}),
                showAsAction: 'always',
                enabled: startEnabled,
                testID: 'create_direct_message.start.button',
            }],
        });
    }, [intl.locale, theme]);

    useEffect(() => {
        const unsubscribe = Navigation.events().registerComponentListener({navigationButtonPressed: ({buttonId}) => {
            if (buttonId === START_BUTTON) {
                startConversation();
            } else if (buttonId === CLOSE_BUTTON) {
                close();
            }
        }}, componentId);
        return () => {
            unsubscribe.remove();
        };
    }, [startConversation]);

    useEffect(() => {
        mounted.current = true;
        updateNavigationButtons(false);
        getProfiles();
        return () => {
            mounted.current = false;
        };
    }, []);

    useEffect(() => {
        const canStart = selectedCount > 0 && !startingConversation;
        updateNavigationButtons(canStart);
    }, [selectedCount > 0, startingConversation, updateNavigationButtons]);

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
            testID='create_direct_message.screen'
        >
            <View style={style.searchBar}>
                <Search
                    testID='create_direct_message.search_bar'
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
            {selectedCount > 0 &&
            <SelectedUsers
                selectedIds={selectedIds}
                warnCount={5}
                maxCount={7}
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
                testID='create_direct_message.user_list'
                tutorialWatched={tutorialWatched}
            />
        </SafeAreaView>
    );
}

