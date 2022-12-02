// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {defineMessages, useIntl} from 'react-intl';
import {DeviceEventEmitter, Keyboard, Platform, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {fetchProfilesInChannel, searchProfiles} from '@actions/remote/user';
import Search from '@components/search';
import UserList from '@components/user_list';
import {Events, General, Screens} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {debounce} from '@helpers/api/general';
import useNavButtonPressed from '@hooks/navigation_button_pressed';
import {t} from '@i18n';
import {openAsBottomSheet, setButtons} from '@screens/navigation';
import NavigationStore from '@store/navigation_store';
import {showRemoveChannelUserSnackbar} from '@utils/snack_bar';
import {changeOpacity, getKeyboardAppearanceFromTheme, makeStyleSheetFromTheme} from '@utils/theme';
import {filterProfilesMatchingTerm} from '@utils/user';

const MANAGE_BUTTON = 'manage-button';

type Props = {
    canManage: boolean;
    channelId: string;
    componentId: string;
    currentTeamId: string;
    currentUserId: string;
    restrictDirectMessage: boolean;
    teammateNameDisplay: string;
    tutorialWatched: boolean;
}

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

const messages = defineMessages({
    add_people: {
        id: t('mobile.add_people.error'),
        defaultMessage: "We couldn't add those users to the channel. Please check your connection and try again.",
    },
    button_manage: {
        id: t('mobile.manage_members.manage'),
        defaultMessage: 'Manage',
    },
    button_done: {
        id: t('mobile.manage_members.done'),
        defaultMessage: 'Done',
    },
});

export default function ManageChannelMembers({
    canManage,
    channelId,
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
    const {formatMessage, locale} = useIntl();

    const searchTimeoutId = useRef<NodeJS.Timeout | null>(null);
    const mounted = useRef(false);

    const [manageEnabled, setManageEnabled] = useState(false);
    const [profiles, setProfiles] = useState<UserProfile[]>([]);
    const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(false);
    const [term, setTerm] = useState('');

    const loadedProfiles = ({users}: {users?: UserProfile[]}) => {
        if (mounted.current) {
            setLoading(false);
            if (users?.length) {
                setProfiles(users);
            }
        }
    };

    const clearSearch = useCallback(() => {
        setTerm('');
        setSearchResults([]);
    }, []);

    const getProfiles = useCallback(debounce(() => {
        if (!loading && !term && mounted.current) {
            setLoading(true);
            fetchProfilesInChannel(serverUrl, channelId).then(loadedProfiles);
        }
    }, 100), [loading, restrictDirectMessage, serverUrl, currentTeamId]);

    const handleSelectProfile = useCallback(async (profile: UserProfile) => {
        if (!manageEnabled) {
            return;
        }
        const screen = Screens.USER_PROFILE;
        const title = formatMessage({id: 'mobile.routes.user_profile', defaultMessage: 'Profile'});
        const closeButtonId = 'close-user-profile';
        const props = {
            channelId,
            closeButtonId,
            location: Screens.USER_PROFILE,
            manageMode: true,
            userId: profile.id,
        };

        Keyboard.dismiss();
        openAsBottomSheet({screen, title, theme, closeButtonId, props});
    }, [manageEnabled]);

    const searchUsers = useCallback(async (searchTerm: string) => {
        const lowerCasedTerm = searchTerm.toLowerCase();
        setLoading(true);

        const results = await searchProfiles(serverUrl, lowerCasedTerm, {team_id: currentTeamId, channel_id: channelId, allow_inactive: true});

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

    const updateNavigationButtons = useCallback(async (manage: boolean) => {
        setButtons(componentId, {
            rightButtons: [{
                color: theme.sidebarHeaderTextColor,
                enabled: true,
                id: MANAGE_BUTTON,
                showAsAction: 'always',
                testID: 'manage_members.button',
                text: formatMessage(manage ? messages.button_done : messages.button_manage),
            }],
        });
    }, [locale, manageEnabled, theme]);

    const toggleManageEnabled = useCallback(() => {
        updateNavigationButtons(!manageEnabled);
        setManageEnabled(!manageEnabled);
    }, [manageEnabled, updateNavigationButtons]);

    const handleRemoveUser = useCallback(async (userId: string) => {
        const index = profiles.findIndex((user) => user.id === userId);
        if (index !== -1) {
            const newProfiles = [...profiles];
            newProfiles.splice(index, 1);
            setProfiles(newProfiles);

            await NavigationStore.waitUntilScreensIsRemoved(Screens.USER_PROFILE);
            showRemoveChannelUserSnackbar();
        }
    }, [profiles]);

    const data = useMemo(() => {
        const isSearch = Boolean(term);
        if (isSearch) {
            return filterProfilesMatchingTerm(searchResults, term);
        }
        return profiles;
    }, [term, searchResults, profiles]);

    useNavButtonPressed(MANAGE_BUTTON, componentId, toggleManageEnabled, [toggleManageEnabled]);

    useEffect(() => {
        mounted.current = true;
        updateNavigationButtons(false);
        getProfiles();
        return () => {
            mounted.current = false;
        };
    }, []);

    useEffect(() => {
        const removeUserListener = DeviceEventEmitter.addListener(Events.REMOVE_USER_FROM_CHANNEL, handleRemoveUser);
        return (() => {
            removeUserListener?.remove();
        });
    }, [handleRemoveUser]);

    return (
        <SafeAreaView
            style={style.container}
            testID='manage_members.screen'
        >
            <View style={style.searchBar}>
                <Search
                    autoCapitalize='none'
                    cancelButtonTitle={formatMessage({id: 'mobile.post.cancel', defaultMessage: 'Cancel'})}
                    keyboardAppearance={getKeyboardAppearanceFromTheme(theme)}
                    onCancel={clearSearch}
                    onChangeText={onSearch}
                    onSubmitEditing={search}
                    placeholder={formatMessage({id: 'search_bar.search', defaultMessage: 'Search'})}
                    placeholderTextColor={changeOpacity(theme.centerChannelColor, 0.5)}
                    testID='manage_members.search_bar'
                    value={term}
                />
            </View>
            <UserList
                currentUserId={currentUserId}
                fetchMore={getProfiles}
                handleSelectProfile={handleSelectProfile}
                loading={loading}
                manageMode={true}
                profiles={data}
                selectedIds={{}}
                showManageMode={canManage && manageEnabled}
                showNoResults={!loading}
                teammateNameDisplay={teammateNameDisplay}
                term={term}
                testID='manage_members.user_list'
                tutorialWatched={tutorialWatched}
            />
        </SafeAreaView>
    );
}

