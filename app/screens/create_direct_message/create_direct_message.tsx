// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useReducer, useRef, useState} from 'react';
import {defineMessages, useIntl} from 'react-intl';
import {Keyboard, LayoutChangeEvent, Platform, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {makeDirectChannel, makeGroupChannel} from '@actions/remote/channel';
import {fetchProfiles, fetchProfilesInTeam, searchProfiles} from '@actions/remote/user';
import CompassIcon from '@components/compass_icon';
import Loading from '@components/loading';
import Search from '@components/search';
import SelectedUsers from '@components/selected_users';
import UserList from '@components/user_list';
import {General} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {debounce} from '@helpers/api/general';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {useModalPosition} from '@hooks/device';
import useNavButtonPressed from '@hooks/navigation_button_pressed';
import {t} from '@i18n';
import {dismissModal, setButtons} from '@screens/navigation';
import {alertErrorWithFallback} from '@utils/draft';
import {changeOpacity, getKeyboardAppearanceFromTheme, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';
import {displayUsername, filterProfilesMatchingTerm} from '@utils/user';

import type {AvailableScreens} from '@typings/screens/navigation';

const messages = defineMessages({
    dm: {
        id: t('mobile.open_dm.error'),
        defaultMessage: "We couldn't open a direct message with {displayName}. Please check your connection and try again.",
    },
    gm: {
        id: t('mobile.open_gm.error'),
        defaultMessage: "We couldn't open a group message with those users. Please check your connection and try again.",
    },
    buttonText: {
        id: t('mobile.create_direct_message.start'),
        defaultMessage: 'Start Conversation',
    },
    toastMessage: {
        id: t('mobile.create_direct_message.max_limit_reached'),
        defaultMessage: 'Group messages are limited to {maxCount} members',
    },
});

const CLOSE_BUTTON = 'close-dms';

type Props = {
    componentId: AvailableScreens;
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

const getStyleFromTheme = makeStyleSheetFromTheme((theme: Theme) => {
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
            color: changeOpacity(theme.centerChannelColor, 0.5),
            ...typography('Body', 600, 'Regular'),
        },
    };
});

function reduceProfiles(state: UserProfile[], action: {type: 'add'; values?: UserProfile[]}) {
    if (action.type === 'add' && action.values?.length) {
        return [...state, ...action.values];
    }
    return state;
}

function removeProfileFromList(list: {[id: string]: UserProfile}, id: string) {
    const newSelectedIds = Object.assign({}, list);

    Reflect.deleteProperty(newSelectedIds, id);
    return newSelectedIds;
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
    const mainView = useRef<View>(null);
    const modalPosition = useModalPosition(mainView);

    const [profiles, dispatchProfiles] = useReducer(reduceProfiles, []);
    const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(false);
    const [term, setTerm] = useState('');
    const [startingConversation, setStartingConversation] = useState(false);
    const [selectedIds, setSelectedIds] = useState<{[id: string]: UserProfile}>({});
    const [showToast, setShowToast] = useState(false);
    const [containerHeight, setContainerHeight] = useState(0);
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
        setSelectedIds((current) => removeProfileFromList(current, id));
    }, []);

    const createDirectChannel = useCallback(async (id: string, selectedUser?: UserProfile): Promise<boolean> => {
        const user = selectedUser || selectedIds[id];
        const displayName = displayUsername(user, intl.locale, teammateNameDisplay);
        const result = await makeDirectChannel(serverUrl, id, displayName);

        if (result.error) {
            alertErrorWithFallback(intl, result.error, messages.dm);
        }

        return !result.error;
    }, [selectedIds, intl.locale, teammateNameDisplay, serverUrl]);

    const createGroupChannel = useCallback(async (ids: string[]): Promise<boolean> => {
        const result = await makeGroupChannel(serverUrl, ids);

        if (result.error) {
            alertErrorWithFallback(intl, result.error, messages.gm);
        }

        return !result.error;
    }, [serverUrl]);

    const startConversation = useCallback(async (selectedId?: {[id: string]: boolean}, selectedUser?: UserProfile) => {
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
            success = await createDirectChannel(idsToUse[0], selectedUser);
        }

        if (success) {
            close();
        } else {
            setStartingConversation(false);
        }
    }, [startingConversation, selectedIds, createGroupChannel, createDirectChannel]);

    const handleSelectProfile = useCallback((user: UserProfile) => {
        if (user.id === currentUserId) {
            const selectedId = {
                [currentUserId]: true,
            };

            startConversation(selectedId, user);
        } else {
            clearSearch();
            setSelectedIds((current) => {
                if (current[user.id]) {
                    return removeProfileFromList(current, user.id);
                }

                const wasSelected = current[user.id];

                if (!wasSelected && selectedCount >= General.MAX_USERS_IN_GM) {
                    setShowToast(true);
                    return current;
                }

                const newSelectedIds = Object.assign({}, current);
                if (!wasSelected) {
                    newSelectedIds[user.id] = user;
                }

                return newSelectedIds;
            });
        }
    }, [currentUserId, clearSearch]);

    const searchUsers = useCallback(async (searchTerm: string) => {
        const lowerCasedTerm = searchTerm.toLowerCase();
        setLoading(true);
        let results;

        if (restrictDirectMessage) {
            results = await searchProfiles(serverUrl, lowerCasedTerm, {team_id: currentTeamId, allow_inactive: true});
        } else {
            results = await searchProfiles(serverUrl, lowerCasedTerm, {allow_inactive: true});
        }

        let searchData: UserProfile[] = [];
        if (results.data) {
            searchData = results.data;
        }

        setSearchResults(searchData);
        setLoading(false);
    }, [restrictDirectMessage, serverUrl, currentTeamId]);

    const search = useCallback(() => {
        searchUsers(term);
    }, [searchUsers, term]);

    const onLayout = useCallback((e: LayoutChangeEvent) => {
        setContainerHeight(e.nativeEvent.layout.height);
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

    const updateNavigationButtons = useCallback(async () => {
        const closeIcon = await CompassIcon.getImageSource('close', 24, theme.sidebarHeaderTextColor);
        setButtons(componentId, {
            leftButtons: [{
                id: CLOSE_BUTTON,
                icon: closeIcon,
                testID: 'close.create_direct_message.button',
            }],
        });
    }, [intl.locale, theme]);

    useNavButtonPressed(CLOSE_BUTTON, componentId, close, [close]);
    useAndroidHardwareBackHandler(componentId, close);

    useEffect(() => {
        mounted.current = true;
        updateNavigationButtons();
        getProfiles();
        return () => {
            mounted.current = false;
        };
    }, []);

    useEffect(() => {
        setShowToast(selectedCount >= General.MAX_USERS_IN_GM);
    }, [selectedCount >= General.MAX_USERS_IN_GM]);

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
            onLayout={onLayout}
            ref={mainView}
            edges={['top', 'left', 'right']}
        >
            <View style={style.searchBar}>
                <Search
                    testID='create_direct_message.search_bar'
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
                testID='create_direct_message.user_list'
                tutorialWatched={tutorialWatched}
            />
            <SelectedUsers
                containerHeight={containerHeight}
                modalPosition={modalPosition}
                showToast={showToast}
                setShowToast={setShowToast}
                toastIcon={'check'}
                toastMessage={formatMessage(messages.toastMessage, {maxCount: General.MAX_USERS_IN_GM})}
                selectedIds={selectedIds}
                onRemove={handleRemoveProfile}
                teammateNameDisplay={teammateNameDisplay}
                onPress={startConversation}
                buttonIcon={'forum-outline'}
                buttonText={formatMessage(messages.buttonText)}
                testID='create_direct_message'
            />
        </SafeAreaView>
    );
}

