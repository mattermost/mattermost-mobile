// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect, useState} from 'react';
import {TouchableOpacity, Text, View, BackHandler} from 'react-native';
import Animated from 'react-native-reanimated';
import {SafeAreaView} from 'react-native-safe-area-context';

import {closePermalink} from '@actions/local/permalink';
import {fetchPostsAround} from '@actions/remote/post';
import {changeOpacity, makeStyleSheetFromTheme} from '@app/utils/theme';
import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import PostList from '@components/post_list/post_list';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {dismissModal} from '@screens/navigation';
import ChannelModel from '@typings/database/models/servers/channel';
import PostModel from '@typings/database/models/servers/post';

type Props = {
    currentUsername: UserProfile['username'];
    postId: PostModel['id'];
    channel: ChannelModel;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        flex: 1,
        marginTop: 20,
    },
    wrapper: {
        backgroundColor: theme.centerChannelBg,
        borderRadius: 6,
        flex: 1,
        margin: 10,
        opacity: 1,
    },
    header: {
        alignItems: 'center',
        borderTopLeftRadius: 6,
        borderTopRightRadius: 6,
        flexDirection: 'row',
        height: 44,
        paddingRight: 16,
        width: '100%',
    },
    dividerContainer: {
        backgroundColor: theme.centerChannelBg,
    },
    divider: {
        backgroundColor: changeOpacity(theme.centerChannelColor, 0.2),
        height: 1,
    },
    close: {
        justifyContent: 'center',
        height: 44,
        width: 40,
        paddingLeft: 7,
    },
    titleContainer: {
        alignItems: 'center',
        flex: 1,
        paddingRight: 40,
    },
    title: {
        color: theme.centerChannelColor,
        fontSize: 17,
        fontWeight: '600',
    },
    postList: {
        flex: 1,
    },
    bottom: {
        borderBottomLeftRadius: 6,
        borderBottomRightRadius: 6,
    },
    footer: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.buttonBg,
        flexDirection: 'row',
        height: 43,
        paddingRight: 16,
        width: '100%',
    },
    jump: {
        color: theme.buttonColor,
        fontSize: 15,
        fontWeight: '600',
        textAlignVertical: 'center',
    },
    errorContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 15,
    },
    errorText: {
        color: changeOpacity(theme.centerChannelColor, 0.4),
        fontSize: 15,
    },
    archiveIcon: {
        color: theme.centerChannelColor,
        fontSize: 16,
        paddingRight: 20,
    },
}));

function Permalink({channel, postId, currentUsername}: Props) {
    const [posts, setPosts] = useState<PostModel[]>([]);
    const theme = useTheme();
    const serverUrl = useServerUrl();

    const style = getStyleSheet(theme);

    useEffect(() => {
        (async () => {
            const data = await fetchPostsAround(serverUrl, channel.id, postId);
            if (data?.posts) {
                setPosts(data.posts);
            }
        })();
    }, []);

    const handleClose = () => {
        dismissModal();
        closePermalink();
    };

    useEffect(() => {
        const listener = BackHandler.addEventListener('hardwareBackPress', () => {
            handleClose();
            return true;
        });

        return () => {
            listener.remove();
        };
    });

    const handlePress = () => {
        return null;
    };

    return (
        <SafeAreaView
            style={style.container}
        >
            <Animated.View style={style.wrapper}>
                <View style={style.header}>
                    <TouchableOpacity
                        style={style.close}
                        onPress={handleClose}
                    >
                        <CompassIcon
                            name='close'
                            size={20}
                            color={theme.centerChannelColor}
                        />
                    </TouchableOpacity>
                    <View style={style.titleContainer}>
                        <Text
                            ellipsizeMode='tail'
                            numberOfLines={1}
                            style={style.title}
                        >
                            {channel.displayName}
                        </Text>
                    </View>
                </View>
                <View style={style.dividerContainer}>
                    <View style={style.divider}/>
                </View>
                <View style={style.postList}>
                    <PostList
                        posts={posts}
                        lastViewedAt={0}
                        isTimezoneEnabled={false}
                        shouldShowJoinLeaveMessages={false}
                        currentTimezone={null}
                        currentUsername={currentUsername}
                        channelId={channel.id}
                        testID='permalink'
                    />
                </View>
                <TouchableOpacity
                    style={[style.footer, style.bottom]}
                    onPress={handlePress}
                >
                    <FormattedText
                        testID='permalink.search.jump'
                        id='mobile.search.jump'
                        defaultMessage='Jump to recent messages'
                        style={style.jump}
                    />
                </TouchableOpacity>
            </Animated.View>
        </SafeAreaView>
    );
}

export default Permalink;
