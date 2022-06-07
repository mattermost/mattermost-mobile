// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {BackHandler, Text, TouchableOpacity, View} from 'react-native';
import Animated from 'react-native-reanimated';
import {Edge, SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';

import {switchToChannelById} from '@actions/remote/channel';
import {fetchPostsAround} from '@actions/remote/post';
import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import Loading from '@components/loading';
import PostList from '@components/post_list';
import {Screens} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {dismissModal} from '@screens/navigation';
import EphemeralStore from '@store/ephemeral_store';
import {buttonBackgroundStyle, buttonTextStyle} from '@utils/buttonStyles';
import {closePermalink} from '@utils/permalink';
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import type ChannelModel from '@typings/database/models/servers/channel';
import type PostModel from '@typings/database/models/servers/post';

type Props = {
    channel?: ChannelModel;
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
    postList: {
        flex: 1,
    },
    loading: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    footer: {
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        padding: 20,
        width: '100%',
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

function Permalink({channel, isCRTEnabled, postId}: Props) {
    const [posts, setPosts] = useState<PostModel[]>([]);
    const [loading, setLoading] = useState(true);
    const theme = useTheme();
    const serverUrl = useServerUrl();
    const insets = useSafeAreaInsets();
    const isTablet = useIsTablet();
    const style = getStyleSheet(theme);

    const containerStyle = useMemo(() => {
        const marginTop = isTablet ? 60 : 20;
        const marginBottom = insets.bottom + (isTablet ? 60 : 20);
        return [style.container, {marginTop, marginBottom}];
    }, [style, insets.bottom, isTablet]);

    useEffect(() => {
        (async () => {
            if (channel?.id) {
                const data = await fetchPostsAround(serverUrl, channel.id, postId, 5, isCRTEnabled);
                if (data?.posts) {
                    setLoading(false);
                    setPosts(data.posts);
                }
            }
        })();
    }, [channel?.id]);

    const handleClose = useCallback(() => {
        dismissModal({componentId: Screens.PERMALINK});
        closePermalink();
    }, []);

    useEffect(() => {
        const listener = BackHandler.addEventListener('hardwareBackPress', () => {
            if (EphemeralStore.getNavigationTopComponentId() === Screens.PERMALINK) {
                handleClose();
                return true;
            }

            return false;
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
        <SafeAreaView
            style={containerStyle}
            testID='permalink.screen'
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
                        <Text
                            ellipsizeMode='tail'
                            numberOfLines={1}
                            style={style.title}
                        >
                            {channel?.displayName}
                        </Text>
                    </View>
                </View>
                {Boolean(channel?.displayName) &&
                <View style={style.divider}/>
                }
                {loading ? (
                    <View style={style.loading}>
                        <Loading
                            color={theme.buttonBg}
                        />
                    </View>
                ) : (
                    <View style={style.postList}>
                        <PostList
                            highlightedId={postId}
                            isCRTEnabled={isCRTEnabled}
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
                <View style={style.footer}>
                    <TouchableOpacity
                        style={[buttonBackgroundStyle(theme, 'lg', 'primary'), {width: '100%'}]}
                        onPress={handlePress}
                        testID='permalink.jump_to_recent_messages.button'
                    >
                        <FormattedText
                            testID='permalink.search.jump'
                            id='mobile.search.jump'
                            defaultMessage='Jump to recent messages'
                            style={buttonTextStyle(theme, 'lg', 'primary')}
                        />
                    </TouchableOpacity>
                </View>
            </Animated.View>
        </SafeAreaView>
    );
}

export default Permalink;
