// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {ScaledSize, StyleSheet, useWindowDimensions, View} from 'react-native';
import Animated, {useAnimatedStyle, withTiming} from 'react-native-reanimated';

import Loading from '@components/loading';
import {useTheme} from '@context/theme';
import {TabTypes, TabType} from '@utils/search';

import FileResults from './file_results';
import PostResults from './post_results';

import type ChannelModel from '@typings/database/models/servers/channel';
import type PostModel from '@typings/database/models/servers/post';

const duration = 250;

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
        loading: {
            justifyContent: 'center',
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
    loading: boolean;
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
    loading,
    posts,
    publicLinkEnabled,
    scrollPaddingTop,
    searchValue,
    selectedTab,
}: Props) => {
    const dimensions = useWindowDimensions();
    const theme = useTheme();
    const styles = useMemo(() => getStyles(dimensions), [dimensions]);

    const transform = useAnimatedStyle(() => {
        const translateX = selectedTab === TabTypes.MESSAGES ? 0 : -dimensions.width;
        return {
            transform: [
                {translateX: withTiming(translateX, {duration})},
            ],
        };
    }, [selectedTab, dimensions.width]);

    const paddingTop = useMemo(() => (
        {paddingTop: scrollPaddingTop, flexGrow: 1}
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
                    <PostResults
                        currentTimezone={currentTimezone}
                        isTimezoneEnabled={isTimezoneEnabled}
                        posts={posts}
                        paddingTop={paddingTop}
                        searchValue={searchValue}
                    />
                </View>
                <View style={styles.result} >
                    <FileResults
                        canDownloadFiles={canDownloadFiles}
                        fileChannels={fileChannels}
                        fileInfos={fileInfos}
                        paddingTop={paddingTop}
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
