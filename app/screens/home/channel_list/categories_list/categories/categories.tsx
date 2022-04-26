// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useRef} from 'react';
import {useIntl} from 'react-intl';
import {FlatList, SectionList, SectionListData, StyleSheet} from 'react-native';

import {switchToChannelById} from '@actions/remote/channel';
import {useServerUrl} from '@context/server';

import CategoryBody from './body';
import LoadCategoriesError from './error';
import CategoryHeader from './header';
import UnreadCategories from './unreads';

import type CategoryModel from '@typings/database/models/servers/category';

type Props = {
    categories: CategoryModel[];
    currentTeamId: string;
    unreadsOnTop: boolean;
}

const styles = StyleSheet.create({
    mainList: {
        width: '100%',

        // marginLeft: -18,
        marginRight: -20,
    },
});

const extractKey = (item: CategoryModel | 'UNREADS') => (item === 'UNREADS' ? 'UNREADS' : item.id);

const Categories = ({categories, currentTeamId, unreadsOnTop}: Props) => {
    const intl = useIntl();
    const listRef = useRef<FlatList>(null);
    const serverUrl = useServerUrl();

    const onChannelSwitch = useCallback(async (channelId: string) => {
        switchToChannelById(serverUrl, channelId);
    }, [serverUrl]);

    const renderCategoryHeader = ({section}: any) => <CategoryHeader category={section.data[0]}/>;

    const renderCategory = useCallback((data: {item: CategoryModel}) => {
        // if (data.item === 'UNREADS') {
        //     return (
        //         <UnreadCategories
        //             currentTeamId={currentTeamId}
        //             onChannelSwitch={onChannelSwitch}
        //         />
        //     );
        // }
        return (
            <>
                {/* <CategoryHeader category={data.item}/> */}
                <CategoryBody
                    category={data.item}
                    locale={intl.locale}
                    onChannelSwitch={onChannelSwitch}
                />
            </>
        );
    }, [currentTeamId, intl.locale, onChannelSwitch]);

    useEffect(() => {
        listRef.current?.scrollToOffset({animated: false, offset: 0});
    }, [currentTeamId]);

    const categoriesToShow = useMemo(() => {
        const orderedCategories = [...categories];
        orderedCategories.sort((a, b) => a.sortOrder - b.sortOrder);

        const secCat = orderedCategories.map((c) => {
            return {
                key: c.id,
                data: [c],
            };
        });

        // if (unreadsOnTop) {
        //     return ['UNREADS' as const, ...secCat];
        // }
        return secCat;
    }, [categories, unreadsOnTop]);

    if (!categories.length) {
        return <LoadCategoriesError/>;
    }

    return (
        <SectionList
            sections={categoriesToShow}
            renderItem={renderCategory}
            renderSectionHeader={renderCategoryHeader}
            contentContainerStyle={styles.mainList}
        />
    );

    /*
    return (
        <FlatList
            data={categoriesToShow}
            ref={listRef}
            renderItem={renderCategory}
            style={styles.mainList}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            keyExtractor={extractKey}
            removeClippedSubviews={true}
            initialNumToRender={5}
            windowSize={15}
            updateCellsBatchingPeriod={10}
            maxToRenderPerBatch={5}

            // @ts-expect-error strictMode not included in the types
            strictMode={true}
        />
    );
    */
};

export default Categories;
