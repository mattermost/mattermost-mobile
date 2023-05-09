// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {StyleSheet, Text, useWindowDimensions, View} from 'react-native';
import Animated, {useAnimatedStyle, withTiming} from 'react-native-reanimated';

import FileResults from '@components/files_search/file_results';
import Loading from '@components/loading';
import {useTheme} from '@context/theme';
import {TabTypes, type TabType} from '@utils/search';

import PostResults from './post_results';

import type ChannelModel from '@typings/database/models/servers/channel';
import type PostModel from '@typings/database/models/servers/post';

const duration = 250;

const getStyles = (width: number, theme: Theme) => {
    return StyleSheet.create({
        container: {
            flex: 1,
            flexDirection: 'row',
            width: width * 2,
        },
        result: {
            flex: 1,
            width,
        },
        text: {
            padding: 20,
            paddingBottom: 2,
            fontSize: 18,
            fontWeight: 'bold',
            marginTop: 60,
            color: theme.centerChannelColor,
        },
        loading: {
            justifyContent: 'center',
            flex: 1,
            width,
        },
    });
};

type Props = {
    appsEnabled: boolean;
    canDownloadFiles: boolean;
    currentTimezone: string;
    customEmojiNames: string[];
    fileChannels: ChannelModel[];
    fileInfos: FileInfo[];
    isTimezoneEnabled: boolean;
    loading: boolean;
    posts: PostModel[];
    publicLinkEnabled: boolean;
    scrollPaddingTop: number;
    searchValue: string;
    selectedTab: TabType;
    numberMessages: number;
    numberFiles: number;
}

const Results = ({
    appsEnabled,
    canDownloadFiles,
    currentTimezone,
    customEmojiNames,
    fileChannels,
    fileInfos,
    isTimezoneEnabled,
    loading,
    posts,
    publicLinkEnabled,
    scrollPaddingTop,
    searchValue,
    selectedTab,
    numberMessages,
    numberFiles,
}: Props) => {
    const {width} = useWindowDimensions();
    const theme = useTheme();
    const styles = useMemo(() => getStyles(width, theme), [width]);

    const transform = useAnimatedStyle(() => {
        const translateX = selectedTab === TabTypes.MESSAGES ? 0 : -width;
        return {
            transform: [
                {translateX: withTiming(translateX, {duration})},
            ],
        };

        // Do not transform if loading new data. Causes a case where post
        // results show up in Files results when the team is changed
    }, [selectedTab, width, !loading]);

    const paddingTop = useMemo(() => (
        {paddingTop: scrollPaddingTop}
    ), [scrollPaddingTop]);

    return (
        <>
            {loading &&
                <Loading
                    color={theme.buttonBg}
                    size='large'
                    containerStyle={[styles.loading, paddingTop]}
                />
            }
            {!loading &&
            <Animated.View style={[styles.container, transform]}>
                <View style={styles.result} >
                    <Text style={styles.text}>{`${numberMessages} search results` }</Text>
                    <PostResults
                        appsEnabled={appsEnabled}
                        currentTimezone={currentTimezone}
                        customEmojiNames={customEmojiNames}
                        isTimezoneEnabled={isTimezoneEnabled}
                        posts={posts}
                        searchValue={searchValue}
                    />
                </View>
                <View style={styles.result} >
                    <Text style={styles.text}>{`${numberFiles} search results`}</Text>
                    <FileResults
                        canDownloadFiles={canDownloadFiles}
                        fileChannels={fileChannels}
                        fileInfos={fileInfos}
                        publicLinkEnabled={publicLinkEnabled}
                        searchValue={searchValue}
                    />
                </View>
            </Animated.View>
            }
        </>
    );
};

export default Results;
