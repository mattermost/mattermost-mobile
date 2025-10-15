// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {DeviceEventEmitter, FlatList, StyleSheet, View} from 'react-native';
import {of as of$} from 'rxjs';
import {switchMap, combineLatestWith} from 'rxjs/operators';

import {switchToChannelById} from '@actions/remote/channel';
import Loading from '@components/loading';
import {Events, Preferences} from '@constants';
import {CHANNEL} from '@constants/screens';
import {useServerUrl} from '@context/server';
import {getPreferenceValue} from '@helpers/api/preference';
import {useIsTablet} from '@hooks/device';
import {useTeamSwitch} from '@hooks/team_switch';
import PerformanceMetricsManager from '@managers/performance_metrics_manager';
import {queryCategoriesByTeamIds} from '@queries/servers/categories';
import {querySidebarPreferences} from '@queries/servers/preference';
import {observeConfigBooleanValue, observeCurrentTeamId, observeOnlyUnreads} from '@queries/servers/system';
import CategoryBody from '@screens/home/channel_list/categories_list/categories/body';
import CategoryHeader from '@screens/home/channel_list/categories_list/categories/header';
import UnreadCategories from '@screens/home/channel_list/categories_list/categories/unreads';

import type {WithDatabaseArgs} from '@typings/database/database';
import type CategoryModel from '@typings/database/models/servers/category';
import type ChannelModel from '@typings/database/models/servers/channel';
import type PreferenceModel from '@typings/database/models/servers/preference';

type Props = {
    categories: CategoryModel[];
    onlyUnreads: boolean;
    unreadsOnTop: boolean;
    filterType?: 'direct_messages' | 'channels' | 'all';
};

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

const DaakiaChatList = ({
    categories,
    onlyUnreads,
    unreadsOnTop,
    filterType = 'all',
}: Props) => {
    const intl = useIntl();
    const listRef = useRef<FlatList>(null);
    const serverUrl = useServerUrl();
    const isTablet = useIsTablet();
    const switchingTeam = useTeamSwitch();
    const teamId = categories[0]?.teamId;
    const showOnlyUnreadsCategory = onlyUnreads && !unreadsOnTop;

    // console.log('DaakiaChatList - filterType:', filterType);
    // console.log('DaakiaChatList - categories:', categories);

    const categoriesToShow = useMemo(() => {
        if (showOnlyUnreadsCategory) {
            return ['UNREADS' as const];
        }

        let filteredCategories = [...categories];

        // Filter based on filterType prop
        if (filterType === 'direct_messages') {
            filteredCategories = filteredCategories.filter((cat) => cat.type === 'direct_messages');
        } else if (filterType === 'channels') {
            filteredCategories = filteredCategories.filter((cat) => cat.type === 'channels' || cat.type === 'custom');
        }

        filteredCategories.sort((a, b) => a.sortOrder - b.sortOrder);

        // console.log('DaakiaChatList - filtered categories:', filteredCategories);

        if (unreadsOnTop) {
            return ['UNREADS' as const, ...filteredCategories];
        }
        return filteredCategories;
    }, [categories, unreadsOnTop, showOnlyUnreadsCategory, filterType]);

    const [initiaLoad, setInitialLoad] = useState(!categoriesToShow.length);

    const onChannelSwitch = useCallback(async (c: Channel | ChannelModel) => {
        DeviceEventEmitter.emit(Events.ACTIVE_SCREEN, CHANNEL);
        PerformanceMetricsManager.startMetric('mobile_channel_switch');
        switchToChannelById(serverUrl, c.id);
    }, [serverUrl]);

    const renderCategory = useCallback((data: {item: CategoryModel | 'UNREADS'}) => {
        if (data.item === 'UNREADS') {
            return (
                <UnreadCategories
                    currentTeamId={teamId}
                    isTablet={isTablet}
                    onChannelSwitch={onChannelSwitch}
                    onlyUnreads={showOnlyUnreadsCategory}
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
    }, [teamId, intl.locale, isTablet, onChannelSwitch, showOnlyUnreadsCategory]);

    useEffect(() => {
        const t = setTimeout(() => {
            setInitialLoad(false);
        }, 0);

        return () => clearTimeout(t);
    }, []);

    useEffect(() => {
        if (switchingTeam) {
            return;
        }

        PerformanceMetricsManager.endMetric('mobile_team_switch', serverUrl);
    }, [switchingTeam, serverUrl]);

    if (!categories.length) {
        return null;
    }

    return (
        <>
            {!switchingTeam && !initiaLoad && showOnlyUnreadsCategory &&
            <View style={styles.mainList}>
                <UnreadCategories
                    currentTeamId={teamId}
                    isTablet={isTablet}
                    onChannelSwitch={onChannelSwitch}
                    onlyUnreads={showOnlyUnreadsCategory}
                />
            </View>
            }
            {!switchingTeam && !initiaLoad && !showOnlyUnreadsCategory && (
                <FlatList
                    data={categoriesToShow}
                    ref={listRef}
                    renderItem={renderCategory}
                    style={styles.mainList}
                    showsHorizontalScrollIndicator={false}
                    showsVerticalScrollIndicator={false}
                    keyExtractor={extractKey}
                    initialNumToRender={categoriesToShow.length}
                />
            )}
            {(switchingTeam || initiaLoad) && (
                <View style={styles.loadingView}>
                    <Loading
                        size='large'
                        themeColor='sidebarText'
                        testID='daakia_chat_list.loading'
                    />
                </View>
            )}
        </>
    );
};

const enhanced = withObservables(
    [],
    ({database}: WithDatabaseArgs) => {
        const currentTeamId = observeCurrentTeamId(database);
        const categories = currentTeamId.pipe(switchMap((ctid) => queryCategoriesByTeamIds(database, [ctid]).observeWithColumns(['sort_order'])));

        const unreadsOnTopUserPreference = querySidebarPreferences(database, Preferences.CHANNEL_SIDEBAR_GROUP_UNREADS).
            observeWithColumns(['value']).
            pipe(
                switchMap((prefs: PreferenceModel[]) => of$(getPreferenceValue<string>(prefs, Preferences.CATEGORIES.SIDEBAR_SETTINGS, Preferences.CHANNEL_SIDEBAR_GROUP_UNREADS))),
            );

        const unreadsOnTopServerPreference = observeConfigBooleanValue(database, 'ExperimentalGroupUnreadChannels');

        const unreadsOnTop = unreadsOnTopServerPreference.pipe(
            combineLatestWith(unreadsOnTopUserPreference),
            switchMap(([s, u]) => {
                if (!u) {
                    return of$(s);
                }

                return of$(u !== 'false');
            }),
        );
        return {
            categories,
            onlyUnreads: observeOnlyUnreads(database),
            unreadsOnTop,
        };
    });

export default withDatabase(enhanced(DaakiaChatList));
