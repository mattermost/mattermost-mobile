// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useRef, useState} from 'react';
import {defineMessages, useIntl} from 'react-intl';
import {Keyboard, type LayoutChangeEvent, Platform, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {makeDirectChannel, makeGroupChannel} from '@actions/remote/channel';
import {fetchProfiles, fetchProfilesInTeam, searchProfiles} from '@actions/remote/user';
import CompassIcon from '@components/compass_icon';
import Loading from '@components/loading';
import Search from '@components/search';
import SelectedUsers from '@components/selected_users';
import ServerUserList from '@components/server_user_list';
import {General, Screens} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {useKeyboardOverlap} from '@hooks/device';
import useNavButtonPressed from '@hooks/navigation_button_pressed';
import SecurityManager from '@managers/security_manager';
import {dismissModal, setButtons} from '@screens/navigation';
import {alertErrorWithFallback} from '@utils/draft';
import {changeOpacity, getKeyboardAppearanceFromTheme, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';
import {displayUsername} from '@utils/user';

import type {AvailableScreens} from '@typings/screens/navigation';

const messages = defineMessages({
    dm: {
        id: 'mobile.open_dm.error',
        defaultMessage: "We couldn't open a direct message with {displayName}. Please check your connection and try again.",
    },
    gm: {
        id: 'mobile.open_gm.error',
        defaultMessage: "We couldn't open a group message with those users. Please check your connection and try again.",
    },
    buttonText: {
        id: 'mobile.create_direct_message.start',
        defaultMessage: 'Start Conversation',
    },
    toastMessage: {
        id: 'mobile.create_direct_message.max_limit_reached',
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

    const mainView = useRef<View>(null);
    const [containerHeight, setContainerHeight] = useState(0);
    const keyboardOverlap = useKeyboardOverlap(mainView, containerHeight);

    const [term, setTerm] = useState('');
    const [startingConversation, setStartingConversation] = useState(false);
    const [selectedIds, setSelectedIds] = useState<{[id: string]: UserProfile}>({});
    const [showToast, setShowToast] = useState(false);
    const selectedCount = Object.keys(selectedIds).length;

    const clearSearch = useCallback(() => {
        setTerm('');
    }, []);

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
    }, [selectedIds, intl, teammateNameDisplay, serverUrl]);

    const createGroupChannel = useCallback(async (ids: string[]): Promise<boolean> => {
        const result = await makeGroupChannel(serverUrl, ids);

        if (result.error) {
            alertErrorWithFallback(intl, result.error, messages.gm);
        }

        return !result.error;
    }, [intl, serverUrl]);

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
    }, [currentUserId, startConversation, clearSearch, selectedCount]);

    const onLayout = useCallback((e: LayoutChangeEvent) => {
        setContainerHeight(e.nativeEvent.layout.height);
    }, []);

    const updateNavigationButtons = useCallback(async () => {
        const closeIcon = await CompassIcon.getImageSource('close', 24, theme.sidebarHeaderTextColor);
        setButtons(componentId, {
            leftButtons: [{
                id: CLOSE_BUTTON,
                icon: closeIcon,
                testID: 'close.create_direct_message.button',
            }],
        });
    }, [componentId, theme.sidebarHeaderTextColor]);

    const onChangeText = useCallback((searchTerm: string) => {
        setTerm(searchTerm);
    }, []);

    const userFetchFunction = useCallback(async (page: number) => {
        let results;
        if (restrictDirectMessage) {
            results = await fetchProfilesInTeam(serverUrl, currentTeamId, page, General.PROFILE_CHUNK_SIZE, '', {active: true});
        } else {
            results = await fetchProfiles(serverUrl, page, General.PROFILE_CHUNK_SIZE, {active: true});
        }

        if (results.users?.length) {
            return results.users;
        }

        return [];
    }, [serverUrl, currentTeamId, restrictDirectMessage]);

    const userSearchFunction = useCallback(async (searchTerm: string) => {
        const lowerCasedTerm = searchTerm.toLowerCase();
        let results;
        if (restrictDirectMessage) {
            results = await searchProfiles(serverUrl, lowerCasedTerm, {team_id: currentTeamId, allow_inactive: false});
        } else {
            results = await searchProfiles(serverUrl, lowerCasedTerm, {allow_inactive: false});
        }

        if (results.data) {
            return results.data;
        }

        return [];
    }, [serverUrl, currentTeamId, restrictDirectMessage]);

    const createUserFilter = useCallback((exactMatches: UserProfile[], searchTerm: string) => {
        return (p: UserProfile) => {
            if (selectedCount > 0 && p.id === currentUserId) {
                return false;
            }

            if (p.username === searchTerm || p.username.startsWith(searchTerm)) {
                exactMatches.push(p);
                return false;
            }

            return true;
        };
    }, [currentUserId, selectedCount]);

    useNavButtonPressed(CLOSE_BUTTON, componentId, close, [close]);
    useAndroidHardwareBackHandler(componentId, close);

    useEffect(() => {
        updateNavigationButtons();
    }, [updateNavigationButtons]);

    useEffect(() => {
        setShowToast(selectedCount >= General.MAX_USERS_IN_GM);
    }, [selectedCount]);

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
            nativeID={SecurityManager.getShieldScreenId(componentId)}
            onLayout={onLayout}
            ref={mainView}
        >
            <View style={style.searchBar}>
                <Search
                    testID='create_direct_message.search_bar'
                    placeholder={formatMessage({id: 'search_bar.search', defaultMessage: 'Search'})}
                    cancelButtonTitle={formatMessage({id: 'mobile.post.cancel', defaultMessage: 'Cancel'})}
                    placeholderTextColor={changeOpacity(theme.centerChannelColor, 0.5)}
                    onChangeText={onChangeText}
                    onCancel={clearSearch}
                    autoCapitalize='none'
                    keyboardAppearance={getKeyboardAppearanceFromTheme(theme)}
                    value={term}
                />
            </View>
            <ServerUserList
                currentUserId={currentUserId}
                handleSelectProfile={handleSelectProfile}
                selectedIds={selectedIds}
                term={term}
                testID='create_direct_message.user_list'
                tutorialWatched={tutorialWatched}
                fetchFunction={userFetchFunction}
                searchFunction={userSearchFunction}
                createFilter={createUserFilter}
                location={Screens.CREATE_DIRECT_MESSAGE}
            />
            <SelectedUsers
                keyboardOverlap={keyboardOverlap}
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
                maxUsers={General.MAX_USERS_IN_GM}
            />
        </SafeAreaView>
    );
}

