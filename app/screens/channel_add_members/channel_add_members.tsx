// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useRef, useState, type ComponentProps, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {Keyboard, type LayoutChangeEvent, Platform, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {searchGroupsByName} from '@actions/local/group';
import {addMembersToChannel} from '@actions/remote/channel';
import {fetchProfilesInGroup, fetchProfilesNotInChannel, searchProfiles} from '@actions/remote/user';
import {isUserProfile} from '@app/utils/user';
import CompassIcon from '@components/compass_icon';
import Loading from '@components/loading';
import Search from '@components/search';
import SelectedUsers from '@components/selected_users';
import ServerUserList from '@components/server_user_list';
import {General} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {useKeyboardOverlap} from '@hooks/device';
import useNavButtonPressed from '@hooks/navigation_button_pressed';
import {t} from '@i18n';
import {dismissModal} from '@screens/navigation';
import {alertErrorWithFallback} from '@utils/draft';
import {mergeNavigationOptions} from '@utils/navigation';
import {showAddChannelMembersSnackbar} from '@utils/snack_bar';
import {changeOpacity, getKeyboardAppearanceFromTheme, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import type {GroupModel} from '@app/database/models/server';
import type ChannelModel from '@typings/database/models/servers/channel';
import type {AvailableScreens} from '@typings/screens/navigation';

const CLOSE_BUTTON_ID = 'close-add-member';
const TEST_ID = 'add_members';
const CLOSE_BUTTON_TEST_ID = 'close.button';

type TGroup = Group | GroupModel;

type GroupSelectionDescriptor = {
    id: string;
    group: TGroup;
    profiles: {[id: string]: UserProfile};
    teamExcluded?: {[id: string]: UserProfile}; // TODO handle members not in team
    channelExcluded?: {[id: string]: UserProfile}; // TODO handle members already in channel
}
type TSelectionValue = false | UserProfile | GroupSelectionDescriptor;

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
            color: changeOpacity(theme.centerChannelColor, 0.5),
            ...typography('Body', 600, 'Regular'),
        },
    };
});

function toObj<T extends {id: string}>(item: T | T[], baseObj?: Record<string, T>) {
    if (Array.isArray(item)) {
        return item.reduce((acc, x) => {
            acc[x.id] = x;
            return acc;
        }, {...baseObj});
    }

    return {...baseObj, [item.id]: item};
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
    const [selected, setSelected] = useState<{[id: string]: TSelectionValue}>({});

    const {ids: selectedIds} = useMemo(() => {
        const ids = Object.entries(selected).reduce((result, [id, item]) => {
            return !item || isUserProfile(item) ? {...result, [id]: item} : {...item.profiles, [item.group.id]: item.group, ...result};
        }, {} as {[id: string]: UserProfile | TGroup});

        return {ids};
    }, [selected]);

    const clearSearch = useCallback(() => {
        setTerm('');
    }, []);

    const handleRemoveProfile = useCallback((id: string) => {
        setSelected((list) => {
            return {...list, [id]: false};
        });
    }, []);

    const addMembers = useCallback(async () => {
        if (!channel) {
            return;
        }

        if (addingMembers) {
            return;
        }

        const idsToUse = Object.entries(selected).reduce((acc, [, item]) => {
            if (item) {
                if (isUserProfile(item)) {
                    acc.add(item.id);
                } else {
                    Object.keys(item.profiles).forEach(acc.add);
                }
            }

            return acc;
        }, new Set<string>());

        if (!idsToUse.size) {
            return;
        }

        setAddingMembers(true);
        const result = await addMembersToChannel(serverUrl, channel.id, Array.from(idsToUse));

        if (result.error) {
            alertErrorWithFallback(intl, result.error, {id: t('mobile.channel_add_members.error'), defaultMessage: 'There has been an error and we could not add those users to the channel.'});
            setAddingMembers(false);
        } else {
            close();
            showAddChannelMembersSnackbar(idsToUse.size);
        }
    }, [channel, addingMembers, selected, serverUrl, intl]);

    const handleSelectProfile = useCallback((user: UserProfile) => {
        // clearSearch();
        if (user.id === currentUserId) {
            return;
        }

        setSelected((list) => {
            if (selectedIds[user.id]) {
                return {...list, [user.id]: false};
            }

            return {...list, [user.id]: user};
        });
    }, [selectedIds, currentUserId, clearSearch]);

    const handleSelectGroup = useCallback(async (group: TGroup) => {
        // clearSearch();

        const users = (await fetchProfilesInGroup(serverUrl, group.id))?.users;

        if (!users) {
            return;
        }

        setSelected((current) => {
            const next = {...current};

            if (next[group.id]) {
                // deslect group

                Reflect.deleteProperty(next, group.id);
                return next;
            }

            const profiles = toObj(users);

            // remove false values to re-select profiles included in group that were individually deslected
            const removeNegation = (id: string) => {
                if (next[id] === false) {
                    Reflect.deleteProperty(next, id);
                }
            };
            Object.keys(profiles).forEach(removeNegation);

            next[group.id] = {id: group.id, group, profiles};

            return next;
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

    const fetchFunc: ComponentProps<typeof ServerUserList>['fetchFunction'] = useCallback(async (page: number) => {
        if (!channel) {
            return [];
        }

        const result = await fetchProfilesNotInChannel(serverUrl, channel.teamId, channel.id, channel.isGroupConstrained, page, General.PROFILE_CHUNK_SIZE);
        if (result.users?.length) {
            return result.users;
        }

        // TODO listing groups when not searching

        return [];
    }, [serverUrl, channel]);

    const searchFunc: ComponentProps<typeof ServerUserList>['searchFunction'] = useCallback(async (searchTerm: string) => {
        if (!channel) {
            return [];
        }

        const lowerCasedTerm = searchTerm.toLowerCase();

        const [
            profileResult,
            groups,
        ] = await Promise.all([
            searchProfiles(serverUrl, lowerCasedTerm, {team_id: channel.teamId, not_in_channel_id: channel.id, allow_inactive: true}),
            searchGroupsByName(serverUrl, lowerCasedTerm),
        ]);

        const profiles = profileResult?.data || [];

        if (groups) {
            return {profiles, groups};
        }

        return profiles;
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
    }, [updateNavigationButtons]);

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
        >
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
                handleSelectGroup={handleSelectGroup}
                selectedIds={selectedIds}
                term={term}
                testID={`${TEST_ID}.user_list`}
                tutorialWatched={tutorialWatched}
                fetchFunction={fetchFunc}
                searchFunction={searchFunc}
                createFilter={createUserFilter}
                spacing={'spacious'}
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

