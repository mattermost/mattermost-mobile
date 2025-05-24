// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {useIntl} from 'react-intl';
import {Platform, SectionList, type SectionListRenderItemInfo, StyleSheet} from 'react-native';
import Animated, {FadeInDown, FadeOutUp} from 'react-native-reanimated';

import {switchToChannelById} from '@actions/remote/channel';
import ChannelItem from '@components/channel_item';
import {useServerUrl} from '@context/server';
import {t} from '@i18n';

import FindChannelsHeader from './header';

import type ChannelModel from '@typings/database/models/servers/channel';

type Props = {
    close: () => Promise<void>;
    keyboardOverlap: number;
    recentChannels: ChannelModel[];
    showTeamName: boolean;
    testID?: string;
}

const sectionNames = {
    recent: {
        id: t('mobile.channel_list.recent'),
        defaultMessage: 'Recent',
    },
};

const style = StyleSheet.create({
    flex: {flex: 1},
});

const buildSections = (recentChannels: ChannelModel[]) => {
    const sections = [];
    if (recentChannels.length) {
        sections.push({
            ...sectionNames.recent,
            data: recentChannels,
        });
    }

    return sections;
};

const UnfilteredList = ({close, keyboardOverlap, recentChannels, showTeamName, testID}: Props) => {
    const intl = useIntl();
    const serverUrl = useServerUrl();
    const [sections, setSections] = useState(buildSections(recentChannels));
    const sectionListStyle = useMemo(() => ({paddingBottom: keyboardOverlap}), [keyboardOverlap]);

    const onPress = useCallback(async (c: Channel | ChannelModel) => {
        await close();
        switchToChannelById(serverUrl, c.id);
    }, [serverUrl, close]);

    const renderSectionHeader = useCallback(({section}: SectionListRenderItemInfo<ChannelModel>) => (
        <FindChannelsHeader sectionName={intl.formatMessage({id: section.id, defaultMessage: section.defaultMessage})}/>
    ), [intl.locale]);

    const renderSectionItem = useCallback(({item}: SectionListRenderItemInfo<ChannelModel>) => {
        return (
            <ChannelItem
                channel={item}
                onPress={onPress}
                isOnCenterBg={true}
                showTeamName={showTeamName}
                shouldHighlightState={true}
                testID={`${testID}.channel_item`}
            />
        );
    }, [onPress, showTeamName]);

    useEffect(() => {
        setSections(buildSections(recentChannels));
    }, [recentChannels]);

    return (
        <Animated.View
            entering={FadeInDown.duration(200)}
            exiting={Platform.select({ios: FadeOutUp.duration(100)}) /* https://mattermost.atlassian.net/browse/MM-63814?focusedCommentId=178584 */}
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
