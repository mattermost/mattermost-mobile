// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {FlatList, StyleSheet, View} from 'react-native';

import {switchToChannelById} from '@actions/remote/channel';
import Loading from '@components/loading';
import {useServerUrl} from '@context/server';
import {useIsTablet} from '@hooks/device';
import {useTeamSwitch} from '@hooks/team_switch';

import CategoryBody from './body';
import LoadCategoriesError from './error';
import CategoryHeader from './header';
import UnreadCategories from './unreads';

import type CategoryModel from '@typings/database/models/servers/category';
import type ChannelModel from '@typings/database/models/servers/channel';

type Props = {
    categories: CategoryModel[];
    onlyUnreads: boolean;
    unreadsOnTop: boolean;
}

const styles = StyleSheet.create({
    mainList: {
        flex: 1,
    },
    loadingView: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
    },
});

const extractKey = (item: CategoryModel | 'UNREADS') => (item === 'UNREADS' ? 'UNREADS' : item.id);

const Categories = ({
    categories,
    onlyUnreads,
    unreadsOnTop,
}: Props) => {
    const intl = useIntl();
    const listRef = useRef<FlatList>(null);
    const serverUrl = useServerUrl();
    const isTablet = useIsTablet();
    const switchingTeam = useTeamSwitch();
    const teamId = categories[0]?.teamId;
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

    const [initiaLoad, setInitialLoad] = useState(!categoriesToShow.length);

    const onChannelSwitch = useCallback(async (c: Channel | ChannelModel) => {
        switchToChannelById(serverUrl, c.id);
    }, [serverUrl]);

    const renderCategory = useCallback((data: {item: CategoryModel | 'UNREADS'}) => {
        if (data.item === 'UNREADS') {
            return (
                <UnreadCategories
                    currentTeamId={teamId}
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
    }, [teamId, intl.locale, isTablet, onChannelSwitch, onlyUnreads]);

    useEffect(() => {
        const t = setTimeout(() => {
            setInitialLoad(false);
        }, 0);

        return () => clearTimeout(t);
    }, []);

    if (!categories.length) {
        return <LoadCategoriesError/>;
    }

    return (
        <>
            {!switchingTeam && !initiaLoad && onlyUnreads &&
            <View style={styles.mainList}>
                <UnreadCategories
                    currentTeamId={teamId}
                    isTablet={isTablet}
                    onChannelSwitch={onChannelSwitch}
                    onlyUnreads={onlyUnreads}
                />
            </View>
            }
            {!switchingTeam && !initiaLoad && !onlyUnreads && (
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
            )}
            {(switchingTeam || initiaLoad) && (
                <View style={styles.loadingView}>
                    <Loading
                        size='large'
                        themeColor='sidebarText'
                    />
                </View>
            )}
        </>
    );
};

export default Categories;
