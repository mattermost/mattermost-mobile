// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useNavigation} from 'expo-router';
import {useCallback, useEffect, useMemo} from 'react';
import {useIntl} from 'react-intl';

import FileFilterComponent from '@components/files/file_filter';
import {Screens} from '@constants';
import {useIsTablet} from '@hooks/device';
import BottomSheet, {TITLE_HEIGHT} from '@screens/bottom_sheet';
import SearchStore from '@store/search_store';
import {bottomSheetSnapPoint} from '@utils/helpers';
import {dismissBottomSheet} from '@utils/navigation/adapter';

import type {FileFilter} from '@utils/file';

// Constants from results/header.tsx
const NUMBER_FILTER_ITEMS = 6;
const FILTER_ITEM_HEIGHT = 48;
const DIVIDERS_HEIGHT = 2;
const TITLE_SEPARATOR_MARGIN = 8;
const TITLE_SEPARATOR_MARGIN_TABLET = 20;

export default function SearchFileFilterRoute() {
    const navigation = useNavigation();
    const isTablet = useIsTablet();
    const intl = useIntl();

    // Get data from store
    const storeData = SearchStore.getFileFilterData();

    if (!storeData) {
        // Should not happen, but handle gracefully
        return null;
    }

    const {initialFilter} = storeData;

    const title = intl.formatMessage({id: 'mobile.search_options', defaultMessage: 'Search options'});

    // Calculate snap points
    const snapPoints = useMemo(() => {
        return [
            1,
            bottomSheetSnapPoint(
                NUMBER_FILTER_ITEMS,
                FILTER_ITEM_HEIGHT,
            ) + TITLE_HEIGHT + DIVIDERS_HEIGHT + (isTablet ? TITLE_SEPARATOR_MARGIN_TABLET : TITLE_SEPARATOR_MARGIN),
        ];
    }, [isTablet]);

    useEffect(() => {
        navigation.setOptions({
            animation: isTablet ? 'default' : 'none',
            headerOptions: {
                headerTitle: title,
                headerShown: isTablet,
            },
        });
    }, [title, isTablet, navigation]);

    const handleFilterChange = useCallback((selectedFilter: FileFilter) => {
        const callback = SearchStore.getFileFilterCallback();
        if (callback) {
            callback(selectedFilter);
            SearchStore.clearFileFilterData();
        }
        dismissBottomSheet();
    }, []);

    const renderContent = useCallback(() => (
        <FileFilterComponent
            initialFilter={initialFilter}
            setFilter={handleFilterChange}
            title={title}
        />
    ), [initialFilter, handleFilterChange, title]);

    return (
        <BottomSheet
            screen={Screens.SEARCH_FILE_FILTER}
            renderContent={renderContent}
            snapPoints={snapPoints}
        />
    );
}
