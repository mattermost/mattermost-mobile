// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {FlatList, StyleSheet} from 'react-native';

import ThreadsButton from '../threads';

import CategoryBody from './body';
import CategoryHeader from './header';

type Props = {
    categories: TempoCategory[];
}

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },
});

const renderCategory = (data: {item: TempoCategory}) => (
    <>
        <CategoryHeader heading={data.item.title}/>
        <CategoryBody channels={data.item.channels}/>
    </>
);

const Categories = (props: Props) => {
    return (
        <FlatList
            data={props.categories}
            renderItem={renderCategory}
            ListHeaderComponent={ThreadsButton}
            style={styles.flex}
        />
    );
};

export default Categories;
