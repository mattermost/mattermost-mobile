// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {Freeze} from 'react-freeze';
import {StyleSheet, View} from 'react-native';
import Animated, {useAnimatedStyle, withTiming} from 'react-native-reanimated';

import FileResults from '@components/files_search/file_results';
import Loading from '@components/loading';
import {useTheme} from '@context/theme';
import {useWindowDimensions} from '@hooks/device';
import {TabTypes, type TabType} from '@utils/search';

import PostResults from './post_results';

import type ChannelModel from '@typings/database/models/servers/channel';
import type PostModel from '@typings/database/models/servers/post';

const duration = 250;

const getStyles = (width: number) => {
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
    enableSecureFilePreview: boolean;
    fileChannels: ChannelModel[];
    fileInfos: FileInfo[];
    loading: boolean;
    posts: PostModel[];
    matches?: SearchMatches;
    publicLinkEnabled: boolean;
    scrollPaddingTop: number;
    searchValue: string;
    selectedTab: TabType;
}

const Results = ({
    appsEnabled,
    canDownloadFiles,
    currentTimezone,
    customEmojiNames,
    enableSecureFilePreview,
    fileChannels,
    fileInfos,
    loading,
    posts,
    matches,
    publicLinkEnabled,
    scrollPaddingTop,
    searchValue,
    selectedTab,
}: Props) => {
    const {width} = useWindowDimensions();
    const theme = useTheme();
    const styles = useMemo(() => getStyles(width), [width]);

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
                <View style={styles.result}>
                    <Freeze freeze={selectedTab !== TabTypes.MESSAGES}>
                        <PostResults
                            appsEnabled={appsEnabled}
                            currentTimezone={currentTimezone}
                            customEmojiNames={customEmojiNames}
                            posts={posts}
                            matches={matches}
                            paddingTop={paddingTop}
                            searchValue={searchValue}
                        />
                    </Freeze>
                </View>
                <View style={styles.result}>
                    <Freeze freeze={selectedTab !== TabTypes.FILES}>
                        <FileResults
                            canDownloadFiles={canDownloadFiles}
                            enableSecureFilePreview={enableSecureFilePreview}
                            fileChannels={fileChannels}
                            fileInfos={fileInfos}
                            paddingTop={paddingTop}
                            publicLinkEnabled={publicLinkEnabled}
                            searchValue={searchValue}
                        />
                    </Freeze>
                </View>
            </Animated.View>
            }
        </>
    );
};

export default Results;
