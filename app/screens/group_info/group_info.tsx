// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect, useCallback} from 'react';
import {useIntl} from 'react-intl';
import {Text, View} from 'react-native';

import {fetchGroupsByNames} from '@actions/remote/groups';
import {fetchProfilesInGroup, searchProfiles} from '@actions/remote/user';
import {useServerUrl} from '@app/context/server';
import {changeOpacity, getKeyboardAppearanceFromTheme, makeStyleSheetFromTheme} from '@app/utils/theme';
import {typography} from '@app/utils/typography';
import Search, {BottomSheetSearch, useSearchTerm} from '@components/search';
import ServerUserList from '@components/server_user_list';
import {Screens} from '@constants';
import {useTheme} from '@context/theme';
import BottomSheet from '@screens/bottom_sheet';

import type {GroupModel} from '@database/models/server';
import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    currentUserId: string;
    group: GroupModel;
    closeButtonId: string;
    location: AvailableScreens;
    tutorialWatched: boolean;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        flex: 1,
    },
    bottomSheetContent: {
        paddingHorizontal: 0,
    },
    header: {
        paddingHorizontal: 20,
    },
    heading: {
        height: 30,
        color: theme.centerChannelColor,
        marginBottom: 8,
        ...typography('Heading', 600, 'SemiBold'),
    },
    subheading: {
        color: theme.centerChannelColor,
        ...typography('Body', 200),
    },
    searchBar: {
        marginHorizontal: 0,
        marginVertical: 20,
    },
    divider: {
        backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
        height: 1,
    },
}));

const GroupInfo = ({
    closeButtonId,
    group,
    currentUserId,
    tutorialWatched,
}: Props) => {
    const {formatMessage} = useIntl();
    const serverUrl = useServerUrl();
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const showSearch = group.memberCount > 10;

    const [term, setTerm, {clear}] = useSearchTerm();

    useEffect(() => {
        fetchGroupsByNames(serverUrl, [group.name], false, true);
    }, []);

    const fetch = useCallback(async (page: number) => {
        const results = await fetchProfilesInGroup(serverUrl, group.id, page);

        if (results.users?.length) {
            return results.users;
        }

        return [];
    }, [serverUrl]);

    const search = useCallback(async (searchTerm: string) => {
        const lowerCasedTerm = searchTerm.toLowerCase();
        const results = await searchProfiles(serverUrl, lowerCasedTerm, {group_constrained: true, allow_inactive: false, in_group_id: group.id});

        if (results.data) {
            return results.data;
        }

        return [];
    }, [serverUrl, group.id]);

    const renderContent = (isTablet: boolean) => {
        const SearchBar = isTablet ? Search : BottomSheetSearch;

        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text
                        style={styles.heading}
                        testID='group_info.heading'
                    >
                        {group.displayName}
                    </Text>
                    <Text
                        style={styles.subheading}
                        testID='group_info.subheading'
                    >
                        {`@${group.name}`}
                        {' • '}
                        {formatMessage({id: 'mobile.group_info.group_members', defaultMessage: '{count} members'}, {count: group.memberCount})}
                    </Text>
                    {showSearch && (
                        <View style={styles.searchBar}>
                            <SearchBar
                                testID='group_info.search_bar'
                                placeholder={formatMessage({id: 'search_bar.search', defaultMessage: 'Search'})}
                                cancelButtonTitle={formatMessage({id: 'mobile.post.cancel', defaultMessage: 'Cancel'})}
                                placeholderTextColor={changeOpacity(theme.centerChannelColor, 0.5)}
                                onChangeText={setTerm}
                                onCancel={clear}
                                autoCapitalize='none'
                                keyboardAppearance={getKeyboardAppearanceFromTheme(theme)}
                                value={term}
                            />
                        </View>
                    )}
                </View>
                {showSearch && <View style={styles.divider}/>}
                <ServerUserList
                    currentUserId={currentUserId}
                    term={term}
                    testID='group_info.user_list'
                    tutorialWatched={tutorialWatched}
                    fetchFunction={fetch}
                    searchFunction={search}
                    forceFetchProfile={true}
                    flatten={true}
                    inBottomSheet={!isTablet}
                />
            </View>
        );
    };

    return (
        <BottomSheet
            renderContent={renderContent}
            closeButtonId={closeButtonId}
            contentStyle={styles.bottomSheetContent}
            componentId={Screens.GROUP_INFO}
            initialSnapIndex={1}
            testID='group_info'
        />
    );
};

export default GroupInfo;
