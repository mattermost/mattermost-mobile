// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useNavigation} from 'expo-router';
import {useCallback, useEffect, useMemo} from 'react';
import {useIntl} from 'react-intl';

import {ITEM_HEIGHT} from '@components/slide_up_panel_item';
import {Screens} from '@constants';
import {useIsTablet} from '@hooks/device';
import BottomSheet, {TITLE_HEIGHT} from '@screens/bottom_sheet';
import BottomSheetTeamList from '@screens/home/search/bottom_sheet_team_list';
import SearchStore from '@store/search_store';
import {bottomSheetSnapPoint} from '@utils/helpers';
import {dismissBottomSheet} from '@utils/navigation/adapter';

const NO_TEAMS_HEIGHT = 392;

export default function SearchTeamListRoute() {
    const navigation = useNavigation();
    const isTablet = useIsTablet();
    const intl = useIntl();

    // Get data from store
    const storeData = SearchStore.getTeamPickerData();

    if (!storeData) {
        // Should not happen, but handle gracefully
        return null;
    }

    const {teamId, teams, crossTeamSearchEnabled} = storeData;

    const title = intl.formatMessage({id: 'mobile.search.team.select', defaultMessage: 'Select a team to search'});

    // Calculate snap points
    const snapPoints = useMemo(() => {
        const points: Array<string | number> = [
            1,
            teams.length ? bottomSheetSnapPoint(Math.min(3, teams.length), ITEM_HEIGHT) + (2 * TITLE_HEIGHT) : NO_TEAMS_HEIGHT,
        ];

        if (teams.length > 3) {
            points.push('80%');
        }

        return points;
    }, [teams]);

    useEffect(() => {
        navigation.setOptions({
            animation: 'none',
            headerOptions: {
                headerTitle: title,
                headerShown: isTablet,
            },
        });
    }, [title, isTablet, navigation]);

    // Wrap callback from store
    const handleTeamSelect = useCallback((selectedTeamId: string) => {
        const callback = SearchStore.getTeamPickerCallback();
        if (callback) {
            callback(selectedTeamId);
            SearchStore.clearTeamPickerData();
        }
        dismissBottomSheet();
    }, []);

    const renderContent = useCallback(() => (
        <BottomSheetTeamList
            setTeamId={handleTeamSelect}
            teams={teams}
            teamId={teamId}
            title={title}
            crossTeamSearchEnabled={crossTeamSearchEnabled}
        />
    ), [handleTeamSelect, teams, teamId, title, crossTeamSearchEnabled]);

    return (
        <BottomSheet
            screen={Screens.SEARCH_TEAM_LIST}
            renderContent={renderContent}
            snapPoints={snapPoints}
        />
    );
}
