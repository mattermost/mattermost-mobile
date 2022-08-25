// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {useIntl} from 'react-intl';
import {SectionList, SectionListRenderItemInfo, StyleSheet} from 'react-native';
import Animated, {FadeInDown, FadeOutUp} from 'react-native-reanimated';

import {switchToChannelById} from '@actions/remote/channel';
import ChannelItem from '@components/channel_item';
import {useServerUrl} from '@context/server';
import {t} from '@i18n';

import FindChannelsHeader from './header';

import type ChannelModel from '@typings/database/models/servers/channel';

type Props = {
    close: () => Promise<void>;
    keyboardHeight: number;
    recentChannels: ChannelModel[];
    showTeamName: boolean;
    unreadChannels: ChannelModel[];
    testID?: string;
}

const sectionNames = {
    unreads: {
        id: t('mobile.channel_list.unreads'),
        defaultMessage: 'Unreads',
    },
    recent: {
        id: t('mobile.channel_list.recent'),
        defaultMessage: 'Recent',
    },
};

const style = StyleSheet.create({
    flex: {flex: 1},
});

const buildSections = (unreadChannels: ChannelModel[], recentChannels: ChannelModel[]) => {
    const sections = [];
    if (unreadChannels.length) {
        sections.push({
            ...sectionNames.unreads,
            data: unreadChannels,
        });
    }

    if (recentChannels.length) {
        sections.push({
            ...sectionNames.recent,
            data: recentChannels,
        });
    }

    return sections;
};

const UnfilteredList = ({close, keyboardHeight, recentChannels, showTeamName, unreadChannels, testID}: Props) => {
    const intl = useIntl();
    const serverUrl = useServerUrl();
    const [sections, setSections] = useState(buildSections(unreadChannels, recentChannels));
    const sectionListStyle = useMemo(() => ({paddingBottom: keyboardHeight}), [keyboardHeight]);

    const onPress = useCallback(async (channelId: string) => {
        await close();
        switchToChannelById(serverUrl, channelId);
    }, [serverUrl, close]);

    const renderSectionHeader = useCallback(({section}: SectionListRenderItemInfo<ChannelModel>) => (
        <FindChannelsHeader sectionName={intl.formatMessage({id: section.id, defaultMessage: section.defaultMessage})}/>
    ), [intl.locale]);

    const renderSectionItem = useCallback(({item}: SectionListRenderItemInfo<ChannelModel>) => {
        return (
            <ChannelItem
                channel={item}
                isInfo={true}
                onPress={onPress}
                showTeamName={showTeamName}
                testID={`${testID}.channel_item`}
            />
        );
    }, [onPress, showTeamName]);

    useEffect(() => {
        setSections(buildSections(unreadChannels, recentChannels));
    }, [unreadChannels, recentChannels]);

    return (
        <Animated.View
            entering={FadeInDown.duration(200)}
            exiting={FadeOutUp.duration(100)}
            style={style.flex}
        >
            <SectionList
                contentContainerStyle={sectionListStyle}
                keyboardDismissMode='interactive'
                keyboardShouldPersistTaps='handled'
                renderItem={renderSectionItem}
                renderSectionHeader={renderSectionHeader}
                sections={sections}
                showsVerticalScrollIndicator={false}
                stickySectionHeadersEnabled={true}
                testID={`${testID}.section_list`}
            />
        </Animated.View>
    );
};

export default UnfilteredList;
