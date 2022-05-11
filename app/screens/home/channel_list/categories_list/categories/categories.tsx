// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {SectionList, SectionListData, SectionListRenderItemInfo, StyleSheet, Text, View} from 'react-native';

import {switchToChannelById} from '@actions/remote/channel';
import ChannelItem from '@components/channel_item';
import Loading from '@components/loading';
import {DMS_CATEGORY} from '@constants/categories';
import {useServerUrl} from '@context/server';
import {useIsTablet} from '@hooks/device';
import {useTeamSwitch} from '@hooks/team_switch';
import CategoryChannelModel from '@typings/database/models/servers/category_channel';
import ChannelModel from '@typings/database/models/servers/channel';
import MyChannelModel from '@typings/database/models/servers/my_channel';

import LoadCategoriesError from './error';
import CategoryHeader from './header';

import type CategoryModel from '@typings/database/models/servers/category';
type Props = {
    categories: CategoryModel[];
    onlyUnreads: boolean;
    unreadsOnTop: boolean;
    allChannels: ChannelModel[];
    allMyChannels: MyChannelModel[];
    allCategoriesChannels: CategoryChannelModel[];
    hiddenChannels: Set<string>;
    dmLimit: number;
    notifyProps: Record<string, Partial<ChannelNotifyProps>>;
    lastUnreadId: string;
    currentChannelId: string;
}

const isUnread = (c: MyChannelModel, settings: Partial<ChannelNotifyProps>) => c.mentionsCount > 0 || (c.isUnread && settings.mark_unread !== 'mention');
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
        justifyContent: 'center',
        height: 32,
        width: 32,
    },
});

const unreadsSectionKey = 'UNREADS';
const addToSection = (section: {[id: string]: ChannelModel[]}, channel: ChannelModel, id: string) => {
    if (section[id]) {
        section[id].push(channel);
    } else {
        section[id] = [channel];
    }
};

const keyExtractor = (channel: ChannelModel) => channel.id;

const Categories = ({
    categories,
    allChannels,
    allMyChannels,
    allCategoriesChannels,
    onlyUnreads,
    unreadsOnTop,
    hiddenChannels,
    dmLimit,
    notifyProps,
    lastUnreadId,
    currentChannelId,
}: Props) => {
    const intl = useIntl();
    const serverUrl = useServerUrl();
    const isTablet = useIsTablet();
    const switchingTeam = useTeamSwitch();

    const onChannelSwitch = useCallback(async (channelId: string) => {
        switchToChannelById(serverUrl, channelId);
    }, [serverUrl]);

    const sections = useMemo(() => {
        // Make only unreads
        const s: Array<SectionListData<ChannelModel, {category: CategoryModel | 'UNREADS'}>> = [];

        const categoryById: {[id: string]: CategoryModel} = {};
        for (const c of categories) {
            categoryById[c.id] = c;
        }

        const channelById: {[id: string]: ChannelModel} = {};
        for (const c of allChannels) {
            channelById[c.id] = c;
        }
        const myChannelById: {[id: string]: MyChannelModel} = {};
        for (const c of allMyChannels) {
            myChannelById[c.id] = c;
        }
        const categoryData: {[id: string]: ChannelModel[]} = {};
        for (const c of allCategoriesChannels) {
            const channel = channelById[c.channelId];
            const myChannel = myChannelById[c.channelId];
            if (!channel || !myChannel) {
                continue;
            }
            if (hiddenChannels.has(channel.name)) {
                continue;
            }
            if (channel.deleteAt > 0 && currentChannelId !== channel.id) {
                continue;
            }
            const unread = isUnread(myChannel, notifyProps[c.channelId]);
            if ((onlyUnreads || unreadsOnTop) && (unread || (isTablet && lastUnreadId === c.channelId))) {
                addToSection(categoryData, channel, unreadsSectionKey);
            } else if (!categoryById[c.categoryId].collapsed || unread) {
                addToSection(categoryData, channel, c.categoryId);
            }
        }

        if (onlyUnreads || unreadsOnTop) {
            s.push({data: categoryData[unreadsSectionKey], category: 'UNREADS'});
        }
        if (onlyUnreads) {
            return s;
        }

        const orderedCategories = [...categories];
        orderedCategories.sort((a, b) => a.sortOrder - b.sortOrder);

        for (const c of orderedCategories) {
            let data = categoryData[c.id] ? [...categoryData[c.id]] : [];
            if (c.sorting !== 'manual') {
                data.sort((a, b) => {
                    switch (c.sorting) {
                        case 'alpha':
                            if ((notifyProps[a.id].mark_unread === 'mention') && !(notifyProps[b.id].mark_unread === 'mention')) {
                                return 1;
                            }
                            if (!(notifyProps[a.id].mark_unread === 'mention') && (notifyProps[b.id].mark_unread === 'mention')) {
                                return -1;
                            }

                            return a.displayName.localeCompare(b.displayName, intl.locale, {numeric: true});
                        default:
                            return myChannelById[a.id].lastPostAt - myChannelById[b.id].lastPostAt;
                    }
                });
            }

            if (c.type === DMS_CATEGORY) {
                data = data.slice(0, dmLimit);
            }
            s.push({data, category: c, key: c.id});
        }
        return s;
    }, [onlyUnreads, unreadsOnTop, allMyChannels, allCategoriesChannels, categories, allMyChannels, hiddenChannels, notifyProps, currentChannelId, intl.locale]);

    const renderSectionHeader = (info: {section: SectionListData<ChannelModel, {category: CategoryModel | 'UNREADS'}>}) => {
        if (info.section.category === 'UNREADS') {
            return (<Text >
                {intl.formatMessage({id: 'mobile.channel_list.unreads', defaultMessage: 'UNREADS'})}
            </Text>);
        }
        return <CategoryHeader category={info.section.category}/>;
    };

    const renderItem = useCallback((info: SectionListRenderItemInfo<ChannelModel, {category: CategoryModel | 'UNREADS'}>) => {
        const name = info.section.category === 'UNREADS' ? 'unreads' : info.section.category.displayName;
        const muted = info.section.category === 'UNREADS' ? false : info.section.category.muted;
        return (
            <ChannelItem
                channel={info.item}
                testID={`category.${name.replace(/ /g, '_').toLocaleLowerCase()}.channel_list_item`}
                onPress={onChannelSwitch}
                isCategoryMuted={muted}
                key={info.item.id}
            />
        );
    }, [onChannelSwitch]);

    if (!categories.length) {
        return <LoadCategoriesError/>;
    }

    return (
        <>
            {!switchingTeam && (
                <SectionList
                    sections={sections}
                    renderSectionHeader={renderSectionHeader}
                    renderItem={renderItem}
                    keyExtractor={keyExtractor}
                />
            )}
            {switchingTeam && (
                <View style={styles.loadingView}>
                    <Loading style={styles.loading}/>
                </View>
            )}
        </>
    );
};

export default Categories;
