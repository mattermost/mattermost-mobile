// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {defineMessages, useIntl} from 'react-intl';
import {DeviceEventEmitter, Keyboard, Platform, StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {fetchChannelMemberships} from '@actions/remote/channel';
import {fetchUsersByIds, searchProfiles} from '@actions/remote/user';
import {PER_PAGE_DEFAULT} from '@client/rest/constants';
import Search from '@components/search';
import SectionNotice from '@components/section_notice';
import UserList from '@components/user_list';
import {Events, General, Screens} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {useAccessControlAttributes} from '@hooks/access_control_attributes';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import useNavButtonPressed from '@hooks/navigation_button_pressed';
import SecurityManager from '@managers/security_manager';
import {openAsBottomSheet, popTopScreen, setButtons} from '@screens/navigation';
import NavigationStore from '@store/navigation_store';
import {showRemoveChannelUserSnackbar} from '@utils/snack_bar';
import {changeOpacity, getKeyboardAppearanceFromTheme} from '@utils/theme';
import {displayUsername, filterDeactivatedProfiles, filterProfilesMatchingTerm} from '@utils/user';

import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    canManageAndRemoveMembers: boolean;
    channelId: string;
    componentId: AvailableScreens;
    currentTeamId: string;
    currentUserId: string;
    tutorialWatched: boolean;
    teammateDisplayNameSetting: string;
    channelAbacPolicyEnforced: boolean;
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    searchBar: {
        marginLeft: 12,
        marginRight: Platform.select({ios: 4, default: 12}),
        marginVertical: 12,
    },
    flatBottomBanner: {
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
    },
});

const messages = defineMessages({
    button_manage: {
        id: 'mobile.manage_members.manage',
        defaultMessage: 'Manage',
    },
    button_done: {
        id: 'mobile.manage_members.done',
        defaultMessage: 'Done',
    },
});

const sortUsers = (a: UserProfile, b: UserProfile, locale: string, teammateDisplayNameSetting: string) => {
    const aName = displayUsername(a, locale, teammateDisplayNameSetting);
    const bName = displayUsername(b, locale, teammateDisplayNameSetting);
    return aName.localeCompare(bName, locale);
};

const MANAGE_BUTTON = 'manage-button';
const EMPTY: UserProfile[] = [];
const EMPTY_MEMBERS: ChannelMembership[] = [];
const EMPTY_IDS = {};
const {USER_PROFILE} = Screens;
const CLOSE_BUTTON_ID = 'close-user-profile';
const TEST_ID = 'manage_members';

export default function ManageChannelMembers({
    canManageAndRemoveMembers,
    channelId,
    componentId,
    currentTeamId,
    currentUserId,
    tutorialWatched,
    teammateDisplayNameSetting,
    channelAbacPolicyEnforced,
}: Props) {
    const serverUrl = useServerUrl();
    const theme = useTheme();
    const {formatMessage, locale} = useIntl();

    const searchTimeoutId = useRef<NodeJS.Timeout | null>(null);
    const mounted = useRef(false);
    const hasMoreProfiles = useRef(true);
    const pageRef = useRef(0);

    // Use the hook to fetch access control attributes
    const {attributeTags} = useAccessControlAttributes('channel', channelId, channelAbacPolicyEnforced);

    const [isManageMode, setIsManageMode] = useState(false);
    const [profiles, setProfiles] = useState<UserProfile[]>(EMPTY);
    const [channelMembers, setChannelMembers] = useState<ChannelMembership[]>(EMPTY_MEMBERS);
    const [searchResults, setSearchResults] = useState<UserProfile[]>(EMPTY);
    const [loading, setLoading] = useState(true);
    const [term, setTerm] = useState('');
    const [searchedTerm, setSearchedTerm] = useState('');

    const clearSearch = useCallback(() => {
        setTerm('');
        setSearchResults(EMPTY);
        if (searchTimeoutId.current) {
            clearTimeout(searchTimeoutId.current);
        }
    }, []);

    const close = useCallback(() => {
        popTopScreen(componentId);
    }, [componentId]);

    useAndroidHardwareBackHandler(componentId, close);

    const handleSelectProfile = useCallback(async (profile: UserProfile) => {
        if (profile.id === currentUserId && isManageMode) {
            return;
        }

        if (profile.id !== currentUserId) {
            await fetchUsersByIds(serverUrl, [profile.id]);
        }

        const title = formatMessage({id: 'mobile.routes.user_profile', defaultMessage: 'Profile'});
        const props = {
            channelId,
            closeButtonId: CLOSE_BUTTON_ID,
            location: USER_PROFILE,
            manageMode: isManageMode,
            userId: profile.id,
            canManageAndRemoveMembers,
        };

        Keyboard.dismiss();
        openAsBottomSheet({screen: USER_PROFILE, title, theme, closeButtonId: CLOSE_BUTTON_ID, props});
    }, [currentUserId, isManageMode, formatMessage, channelId, canManageAndRemoveMembers, theme, serverUrl]);

    const searchUsers = useCallback(async (searchTerm: string) => {
        setSearchedTerm(searchTerm);
        if (!hasMoreProfiles.current) {
            return;
        }
        const lowerCasedTerm = searchTerm.toLowerCase();
        setLoading(true);

        const options: SearchUserOptions = {team_id: currentTeamId, in_channel_id: channelId, allow_inactive: false};
        const {data = EMPTY} = await searchProfiles(serverUrl, lowerCasedTerm, options);

        setSearchResults(data.sort((a, b) => sortUsers(a, b, locale, teammateDisplayNameSetting)));
        setLoading(false);
    }, [serverUrl, channelId, currentTeamId, locale, teammateDisplayNameSetting]);

    const search = useCallback(() => {
        searchUsers(term);
    }, [searchUsers, term]);

    const onSearch = useCallback((text: string) => {
        if (!text) {
            clearSearch();
            return;
        }

        setTerm(text);
        if (searchTimeoutId.current) {
            clearTimeout(searchTimeoutId.current);
        }

        searchTimeoutId.current = setTimeout(() => {
            searchUsers(text);
        }, General.SEARCH_TIMEOUT_MILLISECONDS);
    }, [searchUsers, clearSearch]);

    const updateNavigationButtons = useCallback((manage: boolean) => {
        setButtons(componentId, {
            rightButtons: [{
                color: theme.sidebarHeaderTextColor,
                enabled: true,
                id: MANAGE_BUTTON,
                showAsAction: 'always',
                testID: `${TEST_ID}.button`,
                text: formatMessage(manage ? messages.button_done : messages.button_manage),
            }],
        });
    }, [theme.sidebarHeaderTextColor]);

    const toggleManageEnabled = useCallback(() => {
        updateNavigationButtons(!isManageMode);
        setIsManageMode((prev) => !prev);
    }, [isManageMode, updateNavigationButtons]);

    const handleRemoveUser = useCallback(async (userId: string) => {
        const pIndex = profiles.findIndex((user) => user.id === userId);
        const mIndex = channelMembers.findIndex((m) => m.user_id === userId);
        if (pIndex !== -1) {
            const newProfiles = [...profiles];
            newProfiles.splice(pIndex, 1);
            setProfiles(newProfiles);

            const newMembers = [...channelMembers];
            newMembers.splice(mIndex, 1);
            setChannelMembers(newMembers);

            await NavigationStore.waitUntilScreensIsRemoved(USER_PROFILE);
            showRemoveChannelUserSnackbar();
        }
    }, [profiles, channelMembers]);

    const handleUserChangeRole = useCallback(async ({userId, schemeAdmin}: {userId: string; schemeAdmin: boolean}) => {
        const clone = channelMembers.map((m) => {
            if (m.user_id === userId) {
                m.scheme_admin = schemeAdmin;
                return m;
            }
            return m;
        });

        setChannelMembers(clone);
    }, [channelMembers]);

    const sortedProfiles = useMemo(() => [...profiles].sort((a, b) => {
        return sortUsers(a, b, locale, teammateDisplayNameSetting);
    }), [profiles, locale, teammateDisplayNameSetting]);

    const data = useMemo(() => {
        const isSearch = Boolean(searchedTerm);
        const newProfiles = isSearch ? filterProfilesMatchingTerm(searchResults.length ? searchResults : sortedProfiles, searchedTerm) : profiles;
        return filterDeactivatedProfiles(newProfiles);
    }, [searchResults, profiles, searchedTerm, sortedProfiles]);

    useEffect(() => {
        if (!term) {
            setSearchResults(EMPTY);
            setSearchedTerm('');
        }
    }, [Boolean(term)]);

    useNavButtonPressed(MANAGE_BUTTON, componentId, toggleManageEnabled, [toggleManageEnabled]);

    const getFetchChannelMembers = useCallback(async () => {
        const options: GetUsersOptions = {sort: 'admin', active: true, per_page: PER_PAGE_DEFAULT, page: pageRef.current};
        const {users, members} = await fetchChannelMemberships(serverUrl, channelId, options, true);

        if (!mounted.current) {
            return;
        }

        if (users.length < PER_PAGE_DEFAULT) {
            hasMoreProfiles.current = false;
        }

        if (users.length) {
            setChannelMembers((prev) => [...prev, ...members]);
            setProfiles((prev) => [...prev, ...users]);
        }

        setLoading(false);
    }, [serverUrl, channelId]);

    const handleReachedBottom = useCallback(() => {
        if (hasMoreProfiles.current && !loading && !searchedTerm) {
            pageRef.current += 1;
            setLoading(true);
            getFetchChannelMembers();
        }
    }, [loading, searchedTerm, getFetchChannelMembers]);

    useEffect(() => {
        mounted.current = true;
        getFetchChannelMembers();

        return () => {
            mounted.current = false;
        };
    }, []);

    useEffect(() => {
        if (canManageAndRemoveMembers) {
            updateNavigationButtons(false);
        }
    }, [canManageAndRemoveMembers]);

    useEffect(() => {
        const removeUserListener = DeviceEventEmitter.addListener(Events.REMOVE_USER_FROM_CHANNEL, handleRemoveUser);
        const changeUserRoleListener = DeviceEventEmitter.addListener(Events.MANAGE_USER_CHANGE_ROLE, handleUserChangeRole);
        return (() => {
            removeUserListener?.remove();
            changeUserRoleListener?.remove();
        });
    }, [handleRemoveUser, handleUserChangeRole]);

    return (
        <SafeAreaView
            style={styles.container}
            testID={`${TEST_ID}.screen`}
            nativeID={SecurityManager.getShieldScreenId(componentId)}
        >
            {channelAbacPolicyEnforced && (
                <SectionNotice
                    type='info'
                    title={formatMessage({
                        id: 'channel.abac_policy_enforced.title',
                        defaultMessage: 'Channel access is restricted by user attributes',
                    })}
                    tags={attributeTags.length > 0 ? attributeTags : undefined}
                    location={Screens.MANAGE_CHANNEL_MEMBERS}
                    testID={`${TEST_ID}.notice`}
                    squareCorners={true}
                />
            )}
            <View style={styles.searchBar}>
                <Search
                    autoCapitalize='none'
                    cancelButtonTitle={formatMessage({id: 'mobile.post.cancel', defaultMessage: 'Cancel'})}
                    keyboardAppearance={getKeyboardAppearanceFromTheme(theme)}
                    onCancel={clearSearch}
                    onChangeText={onSearch}
                    onSubmitEditing={search}
                    placeholder={formatMessage({id: 'search_bar.search', defaultMessage: 'Search'})}
                    placeholderTextColor={changeOpacity(theme.centerChannelColor, 0.5)}
                    testID={`${TEST_ID}.search_bar`}
                    value={term}
                />
            </View>
            <UserList
                currentUserId={currentUserId}
                handleSelectProfile={handleSelectProfile}
                loading={loading}
                manageMode={true} // default true to change row select icon to a dropdown
                profiles={data}
                channelMembers={channelMembers}
                selectedIds={EMPTY_IDS}
                showManageMode={canManageAndRemoveMembers && isManageMode}
                showNoResults={!loading}
                term={searchedTerm}
                testID={`${TEST_ID}.user_list`}
                tutorialWatched={tutorialWatched}
                includeUserMargin={true}
                fetchMore={handleReachedBottom}
                location={Screens.MANAGE_CHANNEL_MEMBERS}
            />
        </SafeAreaView>
    );
}
