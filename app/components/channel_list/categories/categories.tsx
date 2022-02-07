// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {FlatList, StyleSheet} from 'react-native';

import CategoryBody from './body';
import CategoryHeader from './header';

import type {CategoryModel} from '@app/database/models/server';

type Props = {
    categories: CategoryModel[];
}

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },
});

const renderCategory = (data: {item: CategoryModel}) => {
    return (
        <>
            <CategoryHeader category={data.item}/>
            <CategoryBody category={data.item}/>
        </>
    );
};

const Categories = (props: Props) => {
    // Sort Categories
    props.categories.sort((a, b) => a.sortOrder - b.sortOrder);

    return (
        <FlatList
            data={props.categories}
            renderItem={renderCategory}
            style={styles.flex}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
        />
    );
};

export default Categories;
