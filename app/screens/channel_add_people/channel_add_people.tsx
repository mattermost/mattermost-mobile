// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useReducer, useRef, useState} from 'react';
import {defineMessages, useIntl} from 'react-intl';
import {Keyboard, Platform, StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {addMembersToChannel} from '@actions/remote/channel';
import {fetchProfilesNotInChannel, searchProfiles} from '@actions/remote/user';
import CompassIcon from '@components/compass_icon';
import Loading from '@components/loading';
import Search from '@components/search';
import SelectedUsers from '@components/selected_users_panel';
import UserList from '@components/user_list';
import {General} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {ChannelModel} from '@database/models/server';
import {debounce} from '@helpers/api/general';
import useNavButtonPressed from '@hooks/navigation_button_pressed';
import {t} from '@i18n';
import {dismissModal, setButtons} from '@screens/navigation';
import {alertErrorWithFallback} from '@utils/draft';
import {changeOpacity, getKeyboardAppearanceFromTheme} from '@utils/theme';
import {filterProfilesMatchingTerm} from '@utils/user';

const ADD_BUTTON = 'add-button';
const CLOSE_BUTTON = 'close-dms';

const close = () => {
    Keyboard.dismiss();
    dismissModal();
};

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
    error: {
        id: t('mobile.channel_add_people.error'),
        defaultMessage: 'We could not add those users to the channel. Please check your connection and try again.',
    },
    button: {
        id: t('mobile.channel_add_people.title'),
        defaultMessage: 'Add Members',
    },
});

function reduceProfiles(state: UserProfile[], action: {type: 'add'; values?: UserProfile[]}) {
    if (action.type === 'add' && action.values?.length) {
        return [...state, ...action.values];
    }
    return state;
}

type Props = {
    componentId: string;
    currentChannel: ChannelModel;
    currentTeamId: string;
    currentUserId: string;
    restrictDirectMessage: boolean;
    teammateNameDisplay: string;
    tutorialWatched: boolean;
}

export default function ChannelAddPeople({
    componentId,
    currentChannel,
    currentTeamId,
    currentUserId,
    restrictDirectMessage,
    teammateNameDisplay,
    tutorialWatched,
}: Props) {
    const serverUrl = useServerUrl();
    const intl = useIntl();
    const theme = useTheme();
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
    const groupConstrained = currentChannel.isGroupConstrained;
    const currentChannelId = currentChannel.id;

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

    const getProfiles = useCallback(debounce(() => {
        if (next.current && !loading && !term && mounted.current) {
            setLoading(true);
            fetchProfilesNotInChannel(serverUrl,
                currentTeamId,
                currentChannelId,
                groupConstrained,
                page.current + 1,
                General.PROFILE_CHUNK_SIZE).then(loadedProfiles);
        }
    }, 100), [loading, isSearch, serverUrl, currentTeamId]);

    const handleRemoveProfile = useCallback((id: string) => {
        const newSelectedIds = Object.assign({}, selectedIds);

        Reflect.deleteProperty(newSelectedIds, id);

        setSelectedIds(newSelectedIds);
    }, [selectedIds]);

    const addPeopleToChannel = useCallback(async (ids: string[]): Promise<boolean> => {
        const result = await addMembersToChannel(serverUrl, currentChannelId, ids, '', false);

        if (result.error) {
            alertErrorWithFallback(intl, result.error, messages.error);
        }

        return !result.error;
    }, [serverUrl]);

    const clearSearch = useCallback(() => {
        setTerm('');
        setSearchResults([]);
    }, []);

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
            success = await addPeopleToChannel(idsToUse);
        }

        if (success) {
            close();
        } else {
            setStartingConversation(false);
        }
    }, [startingConversation, selectedIds, addPeopleToChannel]);

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

    const searchUsers = useCallback(async (searchTerm: string) => {
        const lowerCasedTerm = searchTerm.toLowerCase();
        setLoading(true);

        const results = await searchProfiles(serverUrl, lowerCasedTerm, {
            team_id: currentTeamId,
            allow_inactive: true,
        });

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
                testID: 'close.add_members.button',
            }],
            rightButtons: [{
                color: theme.sidebarHeaderTextColor,
                id: ADD_BUTTON,
                text: formatMessage({id: 'mobile.channel_add_people.button', defaultMessage: 'Add'}),
                showAsAction: 'always',
                enabled: startEnabled,
                testID: 'add_members.start.button',
            }],
        });
    }, [intl.locale, theme]);

    useNavButtonPressed(ADD_BUTTON, componentId, startConversation, [startConversation]);
    useNavButtonPressed(CLOSE_BUTTON, componentId, close, [close]);

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
            testID='add_members.screen'
        >
            <View style={style.searchBar}>
                <Search
                    testID='add_members.search_bar'
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
                testID='add_members.user_list'
                tutorialWatched={tutorialWatched}
            />
        </SafeAreaView>
    );
}
