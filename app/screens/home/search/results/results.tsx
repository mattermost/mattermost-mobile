// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {ScaledSize, StyleSheet, useWindowDimensions, View} from 'react-native';
import Animated, {useAnimatedStyle, withTiming} from 'react-native-reanimated';

import {TabTypes, TabType} from '@utils/search';

import FileResults from './file_results';
import PostResults from './post_results';

import type ChannelModel from '@typings/database/models/servers/channel';
import type PostModel from '@typings/database/models/servers/post';

const getStyles = (dimensions: ScaledSize) => {
    return StyleSheet.create({
        container: {
            flex: 1,
            flexDirection: 'row',
            width: dimensions.width * 2,
        },
        result: {
            flex: 1,
            width: dimensions.width,
        },
    });
};

type Props = {
    canDownloadFiles: boolean;
    currentTimezone: string;
    fileChannels: ChannelModel[];
    fileInfos: FileInfo[];
    isTimezoneEnabled: boolean;
    posts: PostModel[];
    publicLinkEnabled: boolean;
    scrollPaddingTop: number;
    searchValue: string;
    selectedTab: TabType;
}

const Results = ({
    canDownloadFiles,
    currentTimezone,
    fileChannels,
    fileInfos,
    isTimezoneEnabled,
    posts,
    publicLinkEnabled,
    scrollPaddingTop,
    searchValue,
    selectedTab,
}: Props) => {
    const dimensions = useWindowDimensions();
    const styles = getStyles(dimensions);

    const fResults = useMemo(() => (
        <FileResults
            canDownloadFiles={canDownloadFiles}
            fileChannels={fileChannels}
            fileInfos={fileInfos}
            publicLinkEnabled={publicLinkEnabled}
            scrollPaddingTop={scrollPaddingTop}
            searchValue={searchValue}
        />
    ), [
        canDownloadFiles,
        fileChannels,
        fileInfos,
        publicLinkEnabled,
        scrollPaddingTop,
        searchValue,
    ]);

    const pResults = useMemo(() => (
        <PostResults
            currentTimezone={currentTimezone}
            isTimezoneEnabled={isTimezoneEnabled}
            posts={posts}
            scrollPaddingTop={scrollPaddingTop}
            searchValue={searchValue}
        />
    ), [
        currentTimezone,
        isTimezoneEnabled,
        posts,
        scrollPaddingTop,
        searchValue,
    ]);

    const duration = 150;
    const transform = useAnimatedStyle(() => {
        const translateX = selectedTab === TabTypes.MESSAGES ? 0 : -dimensions.width;
        return {
            transform: [
                {translateX: withTiming(translateX, {duration})},
            ],
        };
    }, [selectedTab, dimensions.width]);

    return (
        <Animated.View style={[styles.container, transform]}>
            <View style={styles.result} >
                {pResults}
            </View>
            <View style={styles.result} >
                {fResults}
            </View>
        </Animated.View>
    );
};

export default Results;
