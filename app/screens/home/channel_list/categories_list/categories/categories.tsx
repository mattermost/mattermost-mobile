// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {DeviceEventEmitter, FlatList, StyleSheet, View} from 'react-native';

import {switchToChannelById} from '@actions/remote/channel';
import Loading from '@components/loading';
import {Events} from '@constants';
import {useServerUrl} from '@context/server';
import {useIsTablet} from '@hooks/device';

import CategoryBody from './body';
import LoadCategoriesError from './error';
import CategoryHeader from './header';
import UnreadCategories from './unreads';

import type CategoryModel from '@typings/database/models/servers/category';

type Props = {
    categories: CategoryModel[];
    onlyUnreads: boolean;
    unreadsOnTop: boolean;
}

const styles = StyleSheet.create({
    mainList: {
        flex: 1,
        marginLeft: -18,
        marginRight: -20,
    },
    loadingView: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
    },
    loading: {
        justifyContent: 'center' as const,
        height: 32,
        width: 32,
    },
});

const extractKey = (item: CategoryModel | 'UNREADS') => (item === 'UNREADS' ? 'UNREADS' : item.id);

const Categories = ({categories, onlyUnreads, unreadsOnTop}: Props) => {
    const intl = useIntl();
    const listRef = useRef<FlatList>(null);
    const serverUrl = useServerUrl();
    const isTablet = useIsTablet();
    const teamId = categories[0]?.teamId;
    const [isLoading, setLoading] = useState(false);

    const onChannelSwitch = useCallback(async (channelId: string) => {
        switchToChannelById(serverUrl, channelId);
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

    useEffect(() => {
        let time: NodeJS.Timeout | undefined;
        const l = DeviceEventEmitter.addListener(Events.TEAM_SWITCH, (switching) => {
            if (time) {
                clearTimeout(time);
            }
            if (switching) {
                setLoading(true);
            } else {
                // eslint-disable-next-line max-nested-callbacks
                time = setTimeout(() => setLoading(false), 200);
            }
        });
        return () => {
            l.remove();
            if (time) {
                clearTimeout(time);
            }
        };
    }, []);

    if (!categories.length) {
        return <LoadCategoriesError/>;
    }

    return (
        <>
            {!isLoading && (
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
            {isLoading && (
                <View style={styles.loadingView}>
                    <Loading style={styles.loading}/>
                </View>
            )}
        </>
    );
};

export default Categories;
