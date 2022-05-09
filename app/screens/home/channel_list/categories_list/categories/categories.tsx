// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useRef} from 'react';
import {useIntl} from 'react-intl';
import {FlatList, StyleSheet} from 'react-native';

import {switchToChannelById} from '@actions/remote/channel';
import {useServerUrl} from '@context/server';
import {useIsTablet} from '@hooks/device';

import CategoryBody from './body';
import LoadCategoriesError from './error';
import CategoryHeader from './header';
import UnreadCategories from './unreads';

import type CategoryModel from '@typings/database/models/servers/category';

type Props = {
    categories: CategoryModel[];
    currentTeamId: string;
    onlyUnreads: boolean;
    unreadsOnTop: boolean;
}

const styles = StyleSheet.create({
    mainList: {
        flex: 1,
        marginLeft: -18,
        marginRight: -20,
    },
});

const extractKey = (item: CategoryModel | 'UNREADS') => (item === 'UNREADS' ? 'UNREADS' : item.id);

const Categories = ({categories, currentTeamId, onlyUnreads, unreadsOnTop}: Props) => {
    const intl = useIntl();
    const listRef = useRef<FlatList>(null);
    const serverUrl = useServerUrl();
    const isTablet = useIsTablet();

    const onChannelSwitch = useCallback(async (channelId: string) => {
        switchToChannelById(serverUrl, channelId);
    }, [serverUrl]);

    const renderCategory = useCallback((data: {item: CategoryModel | 'UNREADS'}) => {
        if (data.item === 'UNREADS') {
            return (
                <UnreadCategories
                    currentTeamId={currentTeamId}
                    isTablet={isTablet}
                    onChannelSwitch={onChannelSwitch}
                    onlyUnreads={onlyUnreads}
                />
            );
        }
        return (
            <>
                <CategoryHeader category={data.item}/>
                <CategoryBody
                    category={data.item}
                    isTablet={isTablet}
                    locale={intl.locale}
                    onChannelSwitch={onChannelSwitch}
                />
            </>
        );
    }, [currentTeamId, intl.locale, isTablet, onChannelSwitch, onlyUnreads]);

    useEffect(() => {
        listRef.current?.scrollToOffset({animated: false, offset: 0});
    }, [currentTeamId]);

    const categoriesToShow = useMemo(() => {
        if (onlyUnreads && !unreadsOnTop) {
            return ['UNREADS' as const];
        }
        const orderedCategories = [...categories];
        orderedCategories.sort((a, b) => a.sortOrder - b.sortOrder);
        if (unreadsOnTop) {
            return ['UNREADS' as const, ...orderedCategories];
        }
        return orderedCategories;
    }, [categories, onlyUnreads, unreadsOnTop]);

    if (!categories.length) {
        return <LoadCategoriesError/>;
    }

    return (
        <FlatList
            data={categoriesToShow}
            ref={listRef}
            renderItem={renderCategory}
            style={styles.mainList}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            keyExtractor={extractKey}
            initialNumToRender={categoriesToShow.length}

            // @ts-expect-error strictMode not included in the types
            strictMode={true}
        />
    );
};

export default Categories;
