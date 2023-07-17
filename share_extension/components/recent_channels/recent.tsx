// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useNavigation} from '@react-navigation/native';
import React, {useCallback, useEffect, useState} from 'react';
import {SectionList, type SectionListRenderItemInfo} from 'react-native';

import ChannelItem from '@share/components/channel_item';
import {setShareExtensionChannelId} from '@share/state';

import RecentHeader from './header';

import type ChannelModel from '@typings/database/models/servers/channel';

type Props = {
    recentChannels: ChannelModel[];
    showTeamName: boolean;
    theme: Theme;
}

const buildSections = (recentChannels: ChannelModel[]) => {
    const sections = [{
        data: recentChannels,
    }];
    return sections;
};

const RecentList = ({recentChannels, showTeamName, theme}: Props) => {
    const navigation = useNavigation();
    const [sections, setSections] = useState(buildSections(recentChannels));

    const onPress = useCallback((channelId: string) => {
        setShareExtensionChannelId(channelId);
        navigation.goBack();
    }, []);

    const renderSectionHeader = useCallback(() => (
        <RecentHeader theme={theme}/>
    ), [theme]);

    const renderSectionItem = useCallback(({item}: SectionListRenderItemInfo<ChannelModel>) => {
        return (
            <ChannelItem
                channel={item}
                onPress={onPress}
                showTeamName={showTeamName}
                theme={theme}
            />
        );
    }, [onPress, showTeamName]);

    useEffect(() => {
        setSections(buildSections(recentChannels));
    }, [recentChannels]);

    return (
        <SectionList
            keyboardDismissMode='interactive'
            keyboardShouldPersistTaps='handled'
            renderItem={renderSectionItem}
            renderSectionHeader={renderSectionHeader}
            sections={sections}
            showsVerticalScrollIndicator={false}
            stickySectionHeadersEnabled={true}
        />
    );
};

export default RecentList;
