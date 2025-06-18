// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {Keyboard, type LayoutChangeEvent, Platform, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {addMembersToChannel} from '@actions/remote/channel';
import {fetchProfilesNotInChannel, searchProfiles} from '@actions/remote/user';
import CompassIcon from '@components/compass_icon';
import Loading from '@components/loading';
import Search from '@components/search';
import SectionNotice from '@components/section_notice';
import SelectedUsers from '@components/selected_users';
import ServerUserList from '@components/server_user_list';
import {General, Screens} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {useAccessControlAttributes} from '@hooks/access_control_attributes';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {useKeyboardOverlap} from '@hooks/device';
import useNavButtonPressed from '@hooks/navigation_button_pressed';
import {t} from '@i18n';
import SecurityManager from '@managers/security_manager';
import {dismissModal} from '@screens/navigation';
import {alertErrorWithFallback} from '@utils/draft';
import {mergeNavigationOptions} from '@utils/navigation';
import {showAddChannelMembersSnackbar} from '@utils/snack_bar';
import {changeOpacity, getKeyboardAppearanceFromTheme, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import type ChannelModel from '@typings/database/models/servers/channel';
import type {AvailableScreens} from '@typings/screens/navigation';

const CLOSE_BUTTON_ID = 'close-add-member';
const TEST_ID = 'add_members';
const CLOSE_BUTTON_TEST_ID = 'close.button';

export const getHeaderOptions = async (theme: Theme, displayName: string, inModal = false) => {
    let leftButtons;
    if (!inModal) {
        const closeButton = await CompassIcon.getImageSourceSync('close', 24, theme.sidebarHeaderTextColor);
        leftButtons = [{
            id: CLOSE_BUTTON_ID,
            icon: closeButton,
            testID: `${TEST_ID}.${CLOSE_BUTTON_TEST_ID}`,
        }];
    }
    return {
        topBar: {
            subtitle: {
                color: changeOpacity(theme.sidebarHeaderTextColor, 0.72),
                text: displayName,
            },
            leftButtons,
            backButton: inModal ? {
                color: theme.sidebarHeaderTextColor,
            } : undefined,
        },
    };
};

type Props = {
    componentId: AvailableScreens;
    channel?: ChannelModel;
    currentUserId: string;
    teammateNameDisplay: string;
    tutorialWatched: boolean;
    inModal?: boolean;
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
        flatBottomBanner: {
            borderBottomLeftRadius: 0,
            borderBottomRightRadius: 0,
        },
    };
});

function removeProfileFromList(list: {[id: string]: UserProfile}, id: string) {
    const newSelectedIds = Object.assign({}, list);

    Reflect.deleteProperty(newSelectedIds, id);
    return newSelectedIds;
}

export default function ChannelAddMembers({
    componentId,
    channel,
    currentUserId,
    teammateNameDisplay,
    tutorialWatched,
    inModal,
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
    const [addingMembers, setAddingMembers] = useState(false);
    const [selectedIds, setSelectedIds] = useState<{[id: string]: UserProfile}>({});
    const [showBanner, setShowBanner] = useState(Boolean(channel?.abacPolicyEnforced));

    // Use the hook to fetch access control attributes
    const {attributeTags} = useAccessControlAttributes('channel', channel?.id, channel?.abacPolicyEnforced);

    const handleDismissBanner = useCallback(() => {
        setShowBanner(false);
    }, []);

    const clearSearch = useCallback(() => {
        setTerm('');
    }, []);

    const handleRemoveProfile = useCallback((id: string) => {
        setSelectedIds((current) => removeProfileFromList(current, id));
    }, []);

    const addMembers = useCallback(async () => {
        if (!channel) {
            return;
        }

        if (addingMembers) {
            return;
        }

        const idsToUse = Object.keys(selectedIds);
        if (!idsToUse.length) {
            return;
        }

        setAddingMembers(true);
        const result = await addMembersToChannel(serverUrl, channel.id, idsToUse);

        if (result.error) {
            alertErrorWithFallback(intl, result.error, {id: t('mobile.channel_add_members.error'), defaultMessage: 'There has been an error and we could not add those users to the channel.'});
            setAddingMembers(false);
        } else {
            close();
            showAddChannelMembersSnackbar(idsToUse.length);
        }
    }, [channel, addingMembers, selectedIds, serverUrl, intl]);

    const handleSelectProfile = useCallback((user: UserProfile) => {
        clearSearch();
        setSelectedIds((current) => {
            if (current[user.id]) {
                return removeProfileFromList(current, user.id);
            }

            const newSelectedIds = Object.assign({}, current);
            newSelectedIds[user.id] = user;

            return newSelectedIds;
        });
    }, [currentUserId, clearSearch]);

    const onTextChange = useCallback((searchTerm: string) => {
        setTerm(searchTerm);
    }, []);

    const onLayout = useCallback((e: LayoutChangeEvent) => {
        setContainerHeight(e.nativeEvent.layout.height);
    }, []);

    const updateNavigationButtons = useCallback(async () => {
        const options = await getHeaderOptions(theme, channel?.displayName || '', inModal);
        mergeNavigationOptions(componentId, options);
    }, [theme, channel?.displayName, inModal, componentId]);

    const userFetchFunction = useCallback(async (page: number) => {
        if (!channel) {
            return [];
        }

        const result = await fetchProfilesNotInChannel(serverUrl, channel.teamId, channel.id, channel.isGroupConstrained, page, General.PROFILE_CHUNK_SIZE);
        if (result.users?.length) {
            return result.users.filter((u) => !u.delete_at);
        }

        return [];
    }, [serverUrl, channel]);

    const userSearchFunction = useCallback(async (searchTerm: string) => {
        if (!channel) {
            return [];
        }

        const lowerCasedTerm = searchTerm.toLowerCase();
        const results = await searchProfiles(serverUrl, lowerCasedTerm, {team_id: channel.teamId, not_in_channel_id: channel.id, allow_inactive: false});

        if (results.data) {
            return results.data;
        }

        return [];
    }, [serverUrl, channel]);

    const createUserFilter = useCallback((exactMatches: UserProfile[], searchTerm: string) => {
        return (p: UserProfile) => {
            if (p.username === searchTerm || p.username.startsWith(searchTerm)) {
                exactMatches.push(p);
                return false;
            }

            return true;
        };
    }, []);

    useNavButtonPressed(CLOSE_BUTTON_ID, componentId, close, [close]);
    useAndroidHardwareBackHandler(componentId, close);

    useEffect(() => {
        updateNavigationButtons();
    }, [updateNavigationButtons, channel, serverUrl]);

    if (addingMembers) {
        return (
            <View style={style.container}>
                <Loading color={theme.centerChannelColor}/>
            </View>
        );
    }

    return (
        <SafeAreaView
            style={style.container}
            testID={`${TEST_ID}.screen`}
            onLayout={onLayout}
            ref={mainView}
            edges={['top', 'left', 'right']}
            nativeID={SecurityManager.getShieldScreenId(componentId)}
        >
            {showBanner && (
                <SectionNotice
                    type='info'
                    title={formatMessage({
                        id: 'channel.abac_policy_enforced.title',
                        defaultMessage: 'Channel access is restricted by user attributes',
                    })}
                    text={formatMessage({
                        id: 'channel.abac_policy_enforced.description',
                        defaultMessage: 'Only people who match the specified access rules can be selected and added to this channel.',
                    })}
                    tags={attributeTags.length > 0 ? attributeTags : undefined}
                    isDismissable={true}
                    onDismissClick={handleDismissBanner}
                    location={Screens.CHANNEL_ADD_MEMBERS}
                    testID={`${TEST_ID}.notice`}
                    squareCorners={true}
                />
            )}
            <View style={style.searchBar}>
                <Search
                    testID={`${TEST_ID}.search_bar`}
                    placeholder={formatMessage({id: 'search_bar.search', defaultMessage: 'Search'})}
                    cancelButtonTitle={formatMessage({id: 'mobile.post.cancel', defaultMessage: 'Cancel'})}
                    placeholderTextColor={changeOpacity(theme.centerChannelColor, 0.5)}
                    onChangeText={onTextChange}
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
                testID={`${TEST_ID}.user_list`}
                tutorialWatched={tutorialWatched}
                fetchFunction={userFetchFunction}
                searchFunction={userSearchFunction}
                createFilter={createUserFilter}
                location={Screens.CHANNEL_ADD_MEMBERS}
            />
            <SelectedUsers
                keyboardOverlap={keyboardOverlap}
                selectedIds={selectedIds}
                onRemove={handleRemoveProfile}
                teammateNameDisplay={teammateNameDisplay}
                onPress={addMembers}
                buttonIcon={'account-plus-outline'}
                buttonText={formatMessage({id: 'channel_add_members.add_members.button', defaultMessage: 'Add Members'})}
                testID={`${TEST_ID}.selected`}
            />
        </SafeAreaView>
    );
}
