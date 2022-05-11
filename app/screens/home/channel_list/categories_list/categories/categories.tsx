// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {SectionList, SectionListData, SectionListRenderItemInfo, StyleSheet, Text, View} from 'react-native';

import {switchToChannelById} from '@actions/remote/channel';
import {MyChannelSettingsModel} from '@app/database/models/server';
import ChannelItem from '@components/channel_item';
import Loading from '@components/loading';
import {DMS_CATEGORY} from '@constants/categories';
import {useServerUrl} from '@context/server';
import {useIsTablet} from '@hooks/device';
import {useTeamSwitch} from '@hooks/team_switch';
import CategoryChannelModel from '@typings/database/models/servers/category_channel';
import ChannelModel from '@typings/database/models/servers/channel';
import DraftModel from '@typings/database/models/servers/draft';
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
    allChannelSettings: MyChannelSettingsModel[];
    lastUnreadId: string;
    currentChannelId: string;
    currentUserId: string;
    drafts: DraftModel[];
}

const isUnread = (c: MyChannelModel, settings: {[id: string]: MyChannelSettingsModel}) => c.mentionsCount > 0 || (c.isUnread && settings[c.id]?.notifyProps?.mark_unread !== 'mention');
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

type ItemType = {channel: ChannelModel; myChannel: MyChannelModel; settings: MyChannelSettingsModel; draft: DraftModel}
const addToSection = (section: {[id: string]: ItemType[]}, channel: ChannelModel, myChannel: MyChannelModel, settings: MyChannelSettingsModel, draft: DraftModel, id: string) => {
    if (section[id]) {
        section[id].push({channel, myChannel, settings, draft});
    } else {
        section[id] = [{channel, myChannel, settings, draft}];
    }
};

const keyExtractor = (item: ItemType) => item.channel.id;

const ITEM_HEIGHT = 40;
const getItemLayout = (data: Array<SectionListData<ItemType, { category: CategoryModel | 'UNREADS' }>> | null, index: number) => ({length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index});

const Categories = ({
    categories,
    allChannels,
    allMyChannels,
    allCategoriesChannels,
    onlyUnreads,
    unreadsOnTop,
    hiddenChannels,
    dmLimit,
    allChannelSettings,
    lastUnreadId,
    currentChannelId,
    currentUserId,
    drafts,
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
        const s: Array<SectionListData<ItemType, {category: CategoryModel | 'UNREADS'}>> = [];

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

        const settingsById: {[id: string]: MyChannelSettingsModel} = {};
        for (const c of allChannelSettings) {
            settingsById[c.id] = c;
        }

        const draftsById: {[id: string]: DraftModel} = {};
        for (const d of drafts) {
            draftsById[d.channelId] = d;
        }

        const categoryData: {[id: string]: ItemType[]} = {};
        for (const c of allCategoriesChannels) {
            const channel = channelById[c.channelId];
            const myChannel = myChannelById[c.channelId];
            const settings = settingsById[c.channelId];
            const draft = draftsById[c.channelId];

            if (!channel || !myChannel) {
                continue;
            }
            if (hiddenChannels.has(channel.name)) {
                continue;
            }
            if (channel.deleteAt > 0 && currentChannelId !== channel.id) {
                continue;
            }
            const unread = isUnread(myChannel, settingsById);
            if ((onlyUnreads || unreadsOnTop) && (unread || (isTablet && lastUnreadId === c.channelId))) {
                addToSection(categoryData, channel, myChannel, settings, draft, unreadsSectionKey);
            } else if (!categoryById[c.categoryId]?.collapsed || unread) {
                addToSection(categoryData, channel, myChannel, settings, draft, c.categoryId);
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
                            if ((settingsById[a.channel.id]?.notifyProps?.mark_unread === 'mention') && !(settingsById[b.channel.id]?.notifyProps?.mark_unread === 'mention')) {
                                return 1;
                            }
                            if (!(settingsById[a.channel.id]?.notifyProps?.mark_unread === 'mention') && (settingsById[b.channel.id]?.notifyProps?.mark_unread === 'mention')) {
                                return -1;
                            }

                            return a.channel.displayName.localeCompare(b.channel.displayName, intl.locale, {numeric: true});
                        default:
                            return myChannelById[a.channel.id].lastPostAt - myChannelById[b.channel.id].lastPostAt;
                    }
                });
            }

            if (c.type === DMS_CATEGORY) {
                data = data.slice(0, dmLimit);
            }
            s.push({data, category: c, key: c.id});
        }
        return s;
    }, [onlyUnreads, unreadsOnTop, allMyChannels, allCategoriesChannels, categories, allMyChannels, hiddenChannels, allChannelSettings, currentChannelId, intl.locale]);

    const renderSectionHeader = useCallback((info: {section: SectionListData<ItemType, {category: CategoryModel | 'UNREADS'}>}) => {
        if (info.section.category === 'UNREADS') {
            return (<Text >
                {intl.formatMessage({id: 'mobile.channel_list.unreads', defaultMessage: 'UNREADS'})}
            </Text>);
        }
        return <CategoryHeader category={info.section.category}/>;
    }, [intl]);

    const renderItem = useCallback((info: SectionListRenderItemInfo<ItemType, {category: CategoryModel | 'UNREADS'}>) => {
        const name = info.section.category === 'UNREADS' ? 'unreads' : info.section.category.displayName;
        const muted = info.section.category === 'UNREADS' ? false : info.section.category.muted;
        return (
            <ChannelItem
                channel={info.item.channel}
                myChannel={info.item.myChannel}
                settings={info.item.settings}
                testID={`category.${name.replace(/ /g, '_').toLocaleLowerCase()}.channel_list_item`}
                onPress={onChannelSwitch}
                isCategoryMuted={muted}
                currentUserId={currentUserId}
                hasDraft={Boolean(info.item.draft)}
                key={info.item.channel.id}
                isActive={info.item.channel.id === currentChannelId}
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
                    initialNumToRender={5}
                    maxToRenderPerBatch={5}
                    updateCellsBatchingPeriod={10}
                    windowSize={10}
                    getItemLayout={getItemLayout}
                    removeClippedSubviews={true}
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
