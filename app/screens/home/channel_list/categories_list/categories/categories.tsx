// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import withObservables from '@nozbe/with-observables';
import React, {useCallback, useEffect, useMemo, useRef} from 'react';
import {useIntl} from 'react-intl';
import {FlatList, SectionList, SectionListData, StyleSheet, Text, View} from 'react-native';
import {Observable} from 'rxjs';

import {switchToChannelById} from '@actions/remote/channel';
import {useServerUrl} from '@context/server';

import CategoryBody from './body';
import LoadCategoriesError from './error';
import CategoryHeader from './header';
import EnhancedItem from './item';

import type CategoryModel from '@typings/database/models/servers/category';
import type ChannelModel from '@typings/database/models/servers/channel';

export type Section = {
    id: string;
    data: Observable<ChannelModel[]>;
    category: CategoryModel;
}

type Props = {
    sections: Section[];
}

const styles = StyleSheet.create({
    mainList: {
        width: '100%',
        marginRight: -20,
    },
});

const renderCategoryHeader = ({section}: {section: Section}) => {
    return (<CategoryHeader category={section.category}/>);
};

const Categories = ({sections}: Props) => {
    console.log('--- sections', sections);

    if (!sections.length) {
        return <LoadCategoriesError/>;
    }

    return (<View>
        {sections.map((section) => {
            return (
                <>
                    <CategoryHeader category={section.category}/>
                </>
            );
        })}
    </View>);

    /*
    return (
        <SectionList
            sections={sections}
            renderItem={EnhancedItem}
            renderSectionHeader={renderCategoryHeader}
            contentContainerStyle={styles.mainList}
        />
    );
    */
};

export default Categories;
