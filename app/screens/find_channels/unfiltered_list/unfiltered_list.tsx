// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useState} from 'react';
import {defineMessages, useIntl, type MessageDescriptor} from 'react-intl';
import {Platform, SectionList, type SectionListRenderItemInfo, StyleSheet} from 'react-native';
import Animated, {FadeInDown, FadeOutUp, useAnimatedStyle, type SharedValue} from 'react-native-reanimated';

import {switchToChannelById} from '@actions/remote/channel';
import ChannelItem from '@components/channel_item';
import {useServerUrl} from '@context/server';

import FindChannelsHeader from './header';

import type ChannelModel from '@typings/database/models/servers/channel';

type Props = {
    close: () => Promise<void>;
    keyboardHeight: SharedValue<number>;
    recentChannels: ChannelModel[];
    showTeamName: boolean;
    testID?: string;
}

type Section = {
    name: MessageDescriptor;
    data: ChannelModel[];
}

const sectionNames = defineMessages({
    recent: {
        id: 'mobile.channel_list.recent',
        defaultMessage: 'Recent',
    },
});

const style = StyleSheet.create({
    flex: {flex: 1},
});

const buildSections = (recentChannels: ChannelModel[]): Section[] => {
    const sections: Section[] = [];
    if (recentChannels.length) {
        sections.push({
            name: sectionNames.recent,
            data: recentChannels,
        });
    }

    return sections;
};

const UnfilteredList = ({close, keyboardHeight, recentChannels, showTeamName, testID}: Props) => {
    const intl = useIntl();
    const serverUrl = useServerUrl();
    const [sections, setSections] = useState(buildSections(recentChannels));

    const onPress = useCallback(async (c: Channel | ChannelModel) => {
        await close();
        switchToChannelById(serverUrl, c.id);
    }, [serverUrl, close]);

    const renderSectionHeader = useCallback(({section}: SectionListRenderItemInfo<ChannelModel, Section>) => (
        <FindChannelsHeader sectionName={intl.formatMessage(section.name)}/>
    ), [intl]);

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
    }, [onPress, showTeamName, testID]);

    const sectionListStyle = useAnimatedStyle(() => {
        return {
            marginBottom: keyboardHeight.value,
        };
    });

    useEffect(() => {
        setSections(buildSections(recentChannels));
    }, [recentChannels]);

    return (
        <Animated.View
            entering={FadeInDown.duration(200)}
            exiting={Platform.select({ios: FadeOutUp.duration(100)}) /* https://mattermost.atlassian.net/browse/MM-63814?focusedCommentId=178584 */}
            style={[style.flex, sectionListStyle]}
        >
            <SectionList
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
