// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {Platform, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import Search from '@components/search';
import {General} from '@constants';
import {useTheme} from '@context/theme';
import SelectedUsers from '@screens/members_modal/selected_users';
import UserList from '@screens/members_modal/user_list';
import {changeOpacity, getKeyboardAppearanceFromTheme, makeStyleSheetFromTheme} from '@utils/theme';

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

type Props = {
    currentUserId: string;
    data: UserProfile[];
    getProfiles: () => void;
    loading: boolean;
    onClearSearch: () => void;
    onRemoveProfile: (id: string) => void;
    onSearch: (text: string) => void;
    onSelectProfile: (user: UserProfile) => void;
    page: React.RefObject<any>;
    search: () => void;
    selectedIds: {[id: string]: UserProfile};
    teammateNameDisplay: string;
    term: string;
    tutorialWatched: boolean;
}

export default function MembersModal({
    currentUserId,
    data,
    getProfiles,
    loading,
    onClearSearch,
    onRemoveProfile,
    onSearch,
    onSelectProfile,
    page,
    search,
    selectedIds,
    teammateNameDisplay,
    term,
    tutorialWatched,
}: Props) {
    const theme = useTheme();
    const style = getStyleFromTheme(theme);
    const {formatMessage} = useIntl();

    const selectedCount = Object.keys(selectedIds).length;

    const handleOnSubmitEditing = useCallback(() => {
        search();
    }, [onSelectProfile]);

    const handleOnCancel = useCallback(() => {
        onClearSearch();
    }, [onSelectProfile]);

    const handleSelectProfile = useCallback((user: UserProfile) => {
        onSelectProfile(user);
    }, [onSelectProfile]);

    const handleRemoveProfile = useCallback((id: string) => {
        onRemoveProfile(id);
    }, [onRemoveProfile]);

    return (
        <SafeAreaView
            style={style.container}
            testID='members_modal.screen'
        >
            <View style={style.searchBar}>
                <Search
                    testID='members_modal.search_bar'
                    placeholder={formatMessage({id: 'search_bar.search', defaultMessage: 'Search'})}
                    cancelButtonTitle={formatMessage({id: 'mobile.post.cancel', defaultMessage: 'Cancel'})}
                    placeholderTextColor={changeOpacity(theme.centerChannelColor, 0.5)}
                    onChangeText={onSearch}
                    onSubmitEditing={handleOnSubmitEditing}
                    onCancel={handleOnCancel}
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
                testID='members_modal.user_list'
                tutorialWatched={tutorialWatched}
            />
        </SafeAreaView>
    );
}

