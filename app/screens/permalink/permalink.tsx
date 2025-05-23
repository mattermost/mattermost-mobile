// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {useIntl} from 'react-intl';
import {Alert, Text, TouchableOpacity, View} from 'react-native';
import Animated from 'react-native-reanimated';
import {type Edge, SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';

import {getPosts} from '@actions/local/post';
import {fetchChannelById, joinChannel, switchToChannelById} from '@actions/remote/channel';
import {fetchPostById, fetchPostsAround, fetchPostThread} from '@actions/remote/post';
import {addCurrentUserToTeam, fetchTeamByName, removeCurrentUserFromTeam} from '@actions/remote/team';
import Button from '@components/button';
import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import Loading from '@components/loading';
import PostList from '@components/post_list';
import {Screens} from '@constants';
import {ExtraKeyboardProvider} from '@context/extra_keyboard';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import DatabaseManager from '@database/manager';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {useIsTablet} from '@hooks/device';
import {usePreventDoubleTap} from '@hooks/utils';
import SecurityManager from '@managers/security_manager';
import {getChannelById, getMyChannel} from '@queries/servers/channel';
import {dismissModal} from '@screens/navigation';
import {closePermalink} from '@utils/permalink';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {secureGetFromRecord} from '@utils/types';
import {typography} from '@utils/typography';

import PermalinkError from './permalink_error';

import type ChannelModel from '@typings/database/models/servers/channel';
import type PostModel from '@typings/database/models/servers/post';

type Props = {
    channel?: ChannelModel;
    rootId?: string;
    teamName?: string;
    isTeamMember?: boolean;
    currentTeamId: string;
    isCRTEnabled: boolean;
    postId: PostModel['id'];
}

const edges: Edge[] = ['left', 'right', 'top'];

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        flex: 1,
        maxWidth: 680,
        alignSelf: 'center',
        width: '100%',
    },
    wrapper: {
        backgroundColor: theme.centerChannelBg,
        borderRadius: 12,
        flex: 1,
        margin: 10,
        opacity: 1,
        borderWidth: 1,
        borderColor: changeOpacity(theme.centerChannelColor, 0.16),
    },
    header: {
        alignItems: 'center',
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
        flexDirection: 'row',
        height: 56,
        paddingRight: 16,
        width: '100%',
    },
    divider: {
        backgroundColor: changeOpacity(theme.centerChannelColor, 0.2),
        height: 1,
    },
    close: {
        justifyContent: 'center',
        height: 44,
        width: 40,
        paddingLeft: 16,
    },
    titleContainer: {
        alignItems: 'center',
        flex: 1,
        paddingRight: 40,
    },
    title: {
        color: theme.centerChannelColor,
        ...typography('Heading', 300),
    },
    description: {
        color: theme.centerChannelColor,
        ...typography('Body', 100),
    },
    postList: {
        flex: 1,
    },
    loading: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    footer: {
        padding: 20,
        borderBottomLeftRadius: 12,
        borderBottomRightRadius: 12,
        borderTopWidth: 1,
        borderTopColor: changeOpacity(theme.centerChannelColor, 0.16),
    },
    jump: {
        color: theme.buttonColor,
        fontSize: 15,
        fontWeight: '600',
        textAlignVertical: 'center',
    },
}),
);

const POSTS_LIMIT = 5;

const idExtractor = (item: Post) => {
    return item.id;
};

function Permalink({
    channel,
    rootId,
    isCRTEnabled,
    postId,
    teamName,
    isTeamMember,
    currentTeamId,
}: Props) {
    const intl = useIntl();
    const [posts, setPosts] = useState<PostModel[]>([]);
    const [loading, setLoading] = useState(true);
    const theme = useTheme();
    const serverUrl = useServerUrl();
    const insets = useSafeAreaInsets();
    const isTablet = useIsTablet();
    const style = getStyleSheet(theme);
    const [error, setError] = useState<PermalinkErrorType>();
    const [channelId, setChannelId] = useState(channel?.id);

    const containerStyle = useMemo(() => {
        const marginTop = isTablet ? 60 : 20;
        const marginBottom = insets.bottom + (isTablet ? 60 : 20);
        return [style.container, {marginTop, marginBottom}];
    }, [style, insets.bottom, isTablet]);

    useEffect(() => {
        (async () => {
            if (channelId) {
                let data;
                const loadThreadPosts = isCRTEnabled && rootId;
                if (loadThreadPosts) {
                    data = await fetchPostThread(serverUrl, rootId, {
                        fetchAll: true,
                    });
                } else {
                    data = await fetchPostsAround(serverUrl, channelId, postId, POSTS_LIMIT, isCRTEnabled);
                }
                if (data.error) {
                    setError({unreachable: true});
                }
                if (data.posts) {
                    const ids = data.posts.map(idExtractor);
                    const postsModels = await getPosts(serverUrl, ids, 'desc');
                    setPosts(loadThreadPosts ? processThreadPosts(postsModels, postId) : postsModels);
                }
                setLoading(false);
                return;
            }

            const database = secureGetFromRecord(DatabaseManager.serverDatabases, serverUrl)?.database;
            if (!database) {
                setError({unreachable: true});
                setLoading(false);
                return;
            }

            // If a team is provided, try to join the team, but do not fail here, to take into account:
            // - Wrong team name
            // - DMs/GMs
            let joinedTeam: Team | undefined;
            if (teamName && !isTeamMember) {
                const fetchData = await fetchTeamByName(serverUrl, teamName, true);
                joinedTeam = fetchData.team;

                if (joinedTeam) {
                    const addData = await addCurrentUserToTeam(serverUrl, joinedTeam.id);
                    if (addData.error) {
                        joinedTeam = undefined;
                    }
                }
            }

            const {post} = await fetchPostById(serverUrl, postId, true);
            if (!post) {
                if (joinedTeam) {
                    removeCurrentUserFromTeam(serverUrl, joinedTeam.id);
                }
                setError({notExist: true});
                setLoading(false);
                return;
            }

            const myChannel = await getMyChannel(database, post.channel_id);
            if (myChannel) {
                const localChannel = await getChannelById(database, myChannel.id);

                // Wrong team passed or DM/GM
                if (joinedTeam && localChannel?.teamId !== '' && localChannel?.teamId !== joinedTeam.id) {
                    removeCurrentUserFromTeam(serverUrl, joinedTeam.id);
                    joinedTeam = undefined;
                }

                if (joinedTeam) {
                    setError({
                        joinedTeam: true,
                        channelId: myChannel.id,
                        channelName: localChannel?.displayName,
                        privateTeam: !joinedTeam.allow_open_invite,
                        teamName: joinedTeam.display_name,
                        teamId: joinedTeam.id,
                    });
                    setLoading(false);
                    return;
                }
                setChannelId(post.channel_id);
                return;
            }

            const {channel: fetchedChannel} = await fetchChannelById(serverUrl, post.channel_id);
            if (!fetchedChannel) {
                if (joinedTeam) {
                    removeCurrentUserFromTeam(serverUrl, joinedTeam.id);
                }
                setError({notExist: true});
                setLoading(false);
                return;
            }

            // Wrong team passed or DM/GM
            if (joinedTeam && fetchedChannel.team_id !== '' && fetchedChannel.team_id !== joinedTeam.id) {
                removeCurrentUserFromTeam(serverUrl, joinedTeam.id);
                joinedTeam = undefined;
            }

            setError({
                privateChannel: fetchedChannel.type === 'P',
                joinedTeam: Boolean(joinedTeam),
                channelId: fetchedChannel.id,
                channelName: fetchedChannel.display_name,
                teamId: fetchedChannel.team_id || currentTeamId,
                teamName: joinedTeam?.display_name,
                privateTeam: joinedTeam && !joinedTeam.allow_open_invite,
            });
            setLoading(false);
        })();
    }, [channelId, rootId, isCRTEnabled, teamName]);

    const handleClose = useCallback(() => {
        if (error?.joinedTeam && error.teamId) {
            removeCurrentUserFromTeam(serverUrl, error.teamId);
        }
        dismissModal({componentId: Screens.PERMALINK});
        closePermalink();
    }, [error?.joinedTeam, error?.teamId, serverUrl]);

    useAndroidHardwareBackHandler(Screens.PERMALINK, handleClose);

    const handlePress = usePreventDoubleTap(useCallback(() => {
        if (channel) {
            switchToChannelById(serverUrl, channel.id, channel.teamId);
        }
    }, [channel, serverUrl]));

    const handleJoin = usePreventDoubleTap(useCallback(async () => {
        setLoading(true);
        setError(undefined);
        if (error?.teamId && error.channelId) {
            const {error: joinError} = await joinChannel(serverUrl, error.teamId, error.channelId);
            if (joinError) {
                Alert.alert('Error joining the channel', 'There was an error trying to join the channel');
                setLoading(false);
                setError(error);
                return;
            }
            setChannelId(error.channelId);
        }
    }, [error, serverUrl]));

    let content;
    if (loading) {
        content = (
            <View style={style.loading}>
                <Loading
                    color={theme.buttonBg}
                />
            </View>
        );
    } else if (error) {
        content = (
            <PermalinkError
                error={error}
                handleClose={handleClose}
                handleJoin={handleJoin}
            />
        );
    } else {
        content = (
            <ExtraKeyboardProvider>
                <View style={style.postList}>
                    <PostList
                        highlightedId={postId}
                        isCRTEnabled={isCRTEnabled}
                        posts={posts}
                        location={Screens.PERMALINK}
                        lastViewedAt={0}
                        shouldShowJoinLeaveMessages={false}
                        channelId={channel!.id}
                        rootId={rootId}
                        testID='permalink.post_list'
                        nativeID={Screens.PERMALINK}
                        highlightPinnedOrSaved={false}
                    />
                </View>
                <View style={style.footer}>
                    <Button
                        size='lg'
                        text={intl.formatMessage({id: 'mobile.search.jump', defaultMessage: 'Jump to recent messages'})}
                        theme={theme}
                        onPress={handlePress}
                        testID='permalink.jump_to_recent_messages.button'
                    />
                </View>
            </ExtraKeyboardProvider>
        );
    }

    const showHeaderDivider = Boolean(channel?.displayName) && !error && !loading;
    return (
        <SafeAreaView
            style={containerStyle}
            testID='permalink.screen'
            nativeID={SecurityManager.getShieldScreenId(Screens.PERMALINK)}
            edges={edges}
        >
            <Animated.View style={style.wrapper}>
                <View style={style.header}>
                    <TouchableOpacity
                        style={style.close}
                        onPress={handleClose}
                    >
                        <CompassIcon
                            name='close'
                            size={24}
                            color={theme.centerChannelColor}
                        />
                    </TouchableOpacity>
                    <View style={style.titleContainer}>
                        {isCRTEnabled && rootId ? (
                            <FormattedText
                                id='thread.header.thread'
                                defaultMessage='Thread'
                                style={style.title}
                            />
                        ) : (
                            <Text
                                ellipsizeMode='tail'
                                numberOfLines={1}
                                style={style.title}
                            >
                                {channel?.displayName}
                            </Text>
                        )}
                        {Boolean(isCRTEnabled && rootId) && (
                            <FormattedText
                                ellipsizeMode='tail'
                                id='thread.header.thread_in'
                                defaultMessage='in {channelName}'
                                values={{
                                    channelName: channel?.displayName,
                                }}
                                style={style.description}
                            />
                        )}
                    </View>
                </View>
                {showHeaderDivider && (
                    <View>
                        <View style={style.divider}/>
                    </View>
                )}
                {content}
            </Animated.View>
        </SafeAreaView>
    );
}

// Get the posts around the focused post
function processThreadPosts(posts: PostModel[], postId: string) {
    posts.sort((a, b) => b.createAt - a.createAt);
    const postIndex = posts.findIndex((p) => p.id === postId);
    const start = postIndex - POSTS_LIMIT;
    return posts.slice(start < 0 ? postIndex : start, postIndex + POSTS_LIMIT + 1);
}

export default Permalink;
