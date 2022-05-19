// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {useIntl} from 'react-intl';
import {BackHandler, Text, TouchableOpacity, View} from 'react-native';
import Animated from 'react-native-reanimated';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';

import {fetchChannelById, joinChannel, switchToChannelById} from '@actions/remote/channel';
import {fetchPostById, fetchPostsAround} from '@actions/remote/post';
import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import Loading from '@components/loading';
import PostList from '@components/post_list';
import {Screens} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import DatabaseManager from '@database/manager';
import {privateChannelJoinPrompt, publicChannelJoinPrompt} from '@helpers/api/channel';
import {getMyChannel} from '@queries/servers/channel';
import {getCurrentTeamId, getCurrentUserId} from '@queries/servers/system';
import {dismissModal} from '@screens/navigation';
import ChannelModel from '@typings/database/models/servers/channel';
import PostModel from '@typings/database/models/servers/post';
import {closePermalink} from '@utils/permalink';
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

type Props = {
    postId: PostModel['id'];
    channel?: ChannelModel;
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
    loading: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
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
        flex: 1,
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

function Permalink({
    channel,
    postId,
}: Props) {
    const [posts, setPosts] = useState<PostModel[]>([]);
    const [loading, setLoading] = useState(true);
    const theme = useTheme();
    const serverUrl = useServerUrl();
    const insets = useSafeAreaInsets();
    const style = getStyleSheet(theme);
    const [error, setError] = useState('');
    const intl = useIntl();
    const [channelId, setChannelId] = useState(channel?.id);

    const containerStyle = useMemo(() =>
        [style.container, {marginBottom: insets.bottom}],
    [style, insets.bottom]);

    useEffect(() => {
        (async () => {
            if (channelId) {
                const data = await fetchPostsAround(serverUrl, channelId, postId, 5);
                if (data?.posts) {
                    setLoading(false);
                    setPosts(data.posts);
                }
            } else {
                const database = DatabaseManager.serverDatabases[serverUrl]?.database;
                if (!database) {
                    setError('Database not found');
                    setLoading(false);
                    return;
                }

                const errMessage = intl.formatMessage({id: 'permalink.error.access', defaultMessage: 'Permalink belongs to a deleted message or to a channel to which you do not have access.'});
                const {post} = await fetchPostById(serverUrl, postId, true);
                if (!post) {
                    setError(errMessage);
                    setLoading(false);
                    return;
                }

                const myChannel = await getMyChannel(database, post.channel_id);
                if (!myChannel) {
                    const {channel: fetchedChannel} = await fetchChannelById(serverUrl, post.channel_id);
                    if (!fetchedChannel) {
                        setError(errMessage);
                        setLoading(false);
                        return;
                    }

                    const {join} = fetchedChannel.type === 'P' ? await privateChannelJoinPrompt(fetchedChannel.display_name, intl) : await publicChannelJoinPrompt(fetchedChannel.display_name, intl);
                    if (!join) {
                        setError(errMessage);
                        setLoading(false);
                        return;
                    }

                    await joinChannel(serverUrl, await getCurrentUserId(database), fetchedChannel.team_id || await getCurrentTeamId(database), fetchedChannel.id);
                }

                setChannelId(post.channel_id);
            }
        })();
    }, [channelId]);

    const handleClose = useCallback(() => {
        dismissModal({componentId: Screens.PERMALINK});
        closePermalink();
    }, []);

    useEffect(() => {
        const listener = BackHandler.addEventListener('hardwareBackPress', () => {
            handleClose();
            return true;
        });

        return () => {
            listener.remove();
        };
    }, []);

    const handlePress = useCallback(preventDoubleTap(() => {
        if (channel) {
            switchToChannelById(serverUrl, channel?.id, channel?.teamId);
        }
    }), []);

    return (
        <SafeAreaView style={containerStyle}>
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
                            {channel?.displayName}
                        </Text>
                    </View>
                </View>
                <View style={style.dividerContainer}>
                    <View style={style.divider}/>
                </View>
                {loading && (
                    <View style={style.loading}>
                        <Loading
                            color={theme.buttonBg}
                        />
                    </View>
                )}
                {!loading && !error && (
                    <View style={style.postList}>
                        <PostList
                            highlightedId={postId}
                            posts={posts}
                            location={Screens.PERMALINK}
                            lastViewedAt={0}
                            shouldShowJoinLeaveMessages={false}
                            channelId={channel!.id}
                            testID='permalink.post_list'
                            nativeID={Screens.PERMALINK}
                            highlightPinnedOrSaved={false}
                        />
                    </View>
                )}
                {!loading && Boolean(error) && (
                    <View style={style.errorContainer}>
                        <Text style={style.errorText}>{error}</Text>
                    </View>
                )}
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
