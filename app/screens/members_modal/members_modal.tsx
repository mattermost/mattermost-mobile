// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {Platform, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import Loading from '@components/loading';
import Search from '@components/search';
import {General} from '@constants';
import {useTheme} from '@context/theme';
import SelectedUsers from '@screens/members_modal/selected_users';
import UserList from '@screens/members_modal/user_list';
import {changeOpacity, getKeyboardAppearanceFromTheme, makeStyleSheetFromTheme} from '@utils/theme';
import {filterProfilesMatchingTerm} from '@utils/user';

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
    getProfiles: () => void;
    loading: boolean;
    onClearSearch: () => void;
    onRemoveProfile: (id: string) => void;
    onSearch: (text: string) => void;
    onSelectProfile: (user: UserProfile) => void;
    page: React.RefObject<any>;
    search: () => void;
    selectedIds: {[id: string]: UserProfile};
    startingConversation: boolean;
    teammateNameDisplay: string;
    term: string;
    tutorialWatched: boolean;

    profiles: UserProfile[];
    searchResults: UserProfile[];
}

export default function MembersModal({
    currentUserId,
    getProfiles,
    loading,
    onClearSearch,
    onRemoveProfile,
    onSearch,
    onSelectProfile,
    page,
    search,
    selectedIds,
    startingConversation,
    teammateNameDisplay,
    term,
    tutorialWatched,

    profiles,
    searchResults,
}: Props) {
    const theme = useTheme();
    const style = getStyleFromTheme(theme);
    const {formatMessage} = useIntl();

    const selectedCount = Object.keys(selectedIds).length;

    const isSearch = Boolean(term);

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

