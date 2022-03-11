// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {FlatList, StyleSheet} from 'react-native';

import CategoryBody from './body';
import LoadCategoriesError from './error';
import CategoryHeader from './header';

import type {CategoryModel} from '@database/models/server';

type Props = {
    categories: CategoryModel[];
    currentChannelId: string;
}

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },
});

const extractKey = (item: CategoryModel) => item.id;

const Categories = ({categories, currentChannelId}: Props) => {
    const intl = useIntl();
    const renderCategory = useCallback((data: {item: CategoryModel}) => {
        return (
            <>
                <CategoryHeader category={data.item}/>
                <CategoryBody
                    category={data.item}
                    currentChannelId={currentChannelId}
                    locale={intl.locale}
                />
            </>
        );
    }, [categories, currentChannelId, intl.locale]);

    // Sort Categories
    categories.sort((a, b) => a.sortOrder - b.sortOrder);

    if (!categories.length) {
        return <LoadCategoriesError/>;
    }

    return (
        <FlatList
            data={categories}
            renderItem={renderCategory}
            style={styles.flex}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            keyExtractor={extractKey}
            removeClippedSubviews={true}
            initialNumToRender={5}
            windowSize={15}
            updateCellsBatchingPeriod={10}
            maxToRenderPerBatch={5}
        />
    );
};

export default Categories;
