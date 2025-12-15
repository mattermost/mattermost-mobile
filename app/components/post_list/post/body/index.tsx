// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {LinearGradient} from 'expo-linear-gradient';
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {useIntl} from 'react-intl';
import {type LayoutChangeEvent, type StyleProp, View, type ViewStyle} from 'react-native';
import Animated, {
    cancelAnimation,
    Easing,
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from 'react-native-reanimated';

import Files from '@components/files';
import FormattedText from '@components/formatted_text';
import JumboEmoji from '@components/jumbo_emoji';
import {Screens} from '@constants';
import {THREAD} from '@constants/screens';
import StatusUpdatePost from '@playbooks/components/status_update_post';
import {PLAYBOOKS_UPDATE_STATUS_POST_TYPE} from '@playbooks/constants/plugin';
import EphemeralStore from '@store/ephemeral_store';
import {isEdited as postEdited, isPostFailed, getPostTranslation} from '@utils/post';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import Acknowledgements from './acknowledgements';
import AddMembers from './add_members';
import Content from './content';
import Failed from './failed';
import Message from './message';
import Reactions from './reactions';

import type PostModel from '@typings/database/models/servers/post';
import type {SearchPattern} from '@typings/global/markdown';
import type {AvailableScreens} from '@typings/screens/navigation';

const MAX_RUNNING_TRANSLATIONS = 10;

type BodyProps = {
    appsEnabled: boolean;
    hasFiles: boolean;
    hasReactions: boolean;
    highlight: boolean;
    highlightReplyBar: boolean;
    isCRTEnabled?: boolean;
    isEphemeral: boolean;
    isFirstReply?: boolean;
    isJumboEmoji: boolean;
    isLastReply?: boolean;
    isPendingOrFailed: boolean;
    isPostAcknowledgementEnabled?: boolean;
    isPostAddChannelMember: boolean;
    location: AvailableScreens;
    post: PostModel;
    searchPatterns?: SearchPattern[];
    showAddReaction?: boolean;
    theme: Theme;
    isChannelAutotranslated: boolean;
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        ackAndReactionsContainer: {
            flex: 1,
            flexDirection: 'row',
            flexWrap: 'wrap',
            alignContent: 'flex-start',
            marginTop: 12,
        },
        messageBody: {
            paddingVertical: 2,
            flex: 1,
            overflow: 'hidden',
        },
        messageContainer: {width: '100%'},
        replyBar: {
            backgroundColor: theme.centerChannelColor,
            opacity: 0.1,
            marginLeft: 1,
            marginRight: 7,
            width: 3,
            flexBasis: 3,
        },
        replyBarFirst: {paddingTop: 10},
        replyBarLast: {paddingBottom: 10},
        replyMention: {
            backgroundColor: theme.mentionHighlightBg,
            opacity: 1,
        },
        message: {
            color: theme.centerChannelColor,
            fontSize: 15,
            lineHeight: 20,
        },
        messageContainerWithReplyBar: {
            flexDirection: 'row',
            width: '100%',
        },
        shimmerContainer: {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
        },
        shimmerGradient: {
            flex: 1,
            width: '100%',
        },
    };
});

const gradientSettings = {
    locations: [0.1, 0.5, 0.9] as const,
    start: {x: 0, y: 0},
    end: {x: 1, y: 0},
};

const Body = ({
    appsEnabled,
    hasFiles,
    hasReactions,
    highlight,
    highlightReplyBar,
    isCRTEnabled,
    isEphemeral,
    isFirstReply,
    isJumboEmoji,
    isLastReply,
    isPendingOrFailed,
    isPostAcknowledgementEnabled,
    isPostAddChannelMember,
    location,
    post,
    searchPatterns,
    showAddReaction,
    theme,
    isChannelAutotranslated,
}: BodyProps) => {
    const style = getStyleSheet(theme);
    const isEdited = postEdited(post);
    const isFailed = isPostFailed(post);
    const [layoutWidth, setLayoutWidth] = useState(0);
    const hasBeenDeleted = Boolean(post.deleteAt);
    const intl = useIntl();
    let body;
    let message;

    const nBindings = Array.isArray(post.props?.app_bindings) ? post.props?.app_bindings.length : 0;
    const nAttachments = Array.isArray(post.props?.attachments) ? post.props?.attachments.length : 0;

    const isReplyPost = Boolean(post.rootId && (!isEphemeral || !hasBeenDeleted) && location !== THREAD);
    const hasContent = Boolean((post.metadata?.embeds?.length || (appsEnabled && nBindings)) || nAttachments);

    const replyBarStyle = useMemo<StyleProp<ViewStyle>|undefined>(() => {
        if (!isReplyPost || (isCRTEnabled && location === Screens.PERMALINK)) {
            return undefined;
        }

        const barStyle: StyleProp<ViewStyle> = [style.replyBar];

        if (isFirstReply) {
            barStyle.push(style.replyBarFirst);
        }

        if (isLastReply) {
            barStyle.push(style.replyBarLast);
        }

        if (highlightReplyBar) {
            barStyle.push(style.replyMention);
        }

        return barStyle;
    }, [highlightReplyBar, isCRTEnabled, isFirstReply, isLastReply, isReplyPost, location, style]);

    const onLayout = useCallback((e: LayoutChangeEvent) => {
        setLayoutWidth(e.nativeEvent.layout.width);
    }, []);

    if (hasBeenDeleted) {
        body = (
            <FormattedText
                style={style.message}
                id='post_body.deleted'
                defaultMessage='(message deleted)'
            />
        );
    } else if (post.type === PLAYBOOKS_UPDATE_STATUS_POST_TYPE && post.props != null) {
        message = (
            <StatusUpdatePost
                location={location}
                post={post}
                theme={theme}
            />
        );
    } else if (isPostAddChannelMember) {
        message = (
            <AddMembers
                location={location}
                post={post}
                theme={theme}
            />
        );
    } else if (isJumboEmoji) {
        message = (
            <JumboEmoji
                baseTextStyle={style.message}
                isEdited={isEdited}
                value={post.message}
            />
        );
    } else if (post.message.length || isEdited) { // isEdited is added to handle the case where the post is edited and the message is empty
        message = (
            <Message
                highlight={highlight}
                isEdited={isEdited}
                isPendingOrFailed={isPendingOrFailed}
                isReplyPost={isReplyPost}
                layoutWidth={layoutWidth}
                location={location}
                post={post}
                searchPatterns={searchPatterns}
                theme={theme}
                isChannelAutotranslated={isChannelAutotranslated}
            />
        );
    }

    const acknowledgementsVisible = isPostAcknowledgementEnabled && post.metadata?.priority?.requested_ack;
    const reactionsVisible = hasReactions && showAddReaction;

    const translation = getPostTranslation(post, intl.locale);
    const isTranslating = translation?.state === 'processing';
    const shimmerTranslateX = useSharedValue(-1);

    useEffect(() => {
        if (isTranslating) {
            if (EphemeralStore.totalRunningTranslations() < MAX_RUNNING_TRANSLATIONS) {
                EphemeralStore.addRunningTranslation(post.id);
                shimmerTranslateX.value = withRepeat(
                    withTiming(1, {
                        duration: 1000,
                        easing: Easing.linear,
                    }),
                    -1,
                );
            } else {
                shimmerTranslateX.value = 0;
            }
        }

        return () => {
            EphemeralStore.removeRunningTranslation(post.id);
            cancelAnimation(shimmerTranslateX);
            shimmerTranslateX.value = -1;
        };
    }, [isTranslating, post.id, shimmerTranslateX]);

    const shimmerAnimatedStyle = useAnimatedStyle(() => {
        const translateX = interpolate(
            shimmerTranslateX.value,
            [-1, 1],
            [-layoutWidth, layoutWidth],
        );
        return {
            transform: [{translateX}],
        };
    });

    const gradientColors = useMemo(() => {
        return [
            'transparent',
            changeOpacity(theme.centerChannelColor, 0.2),
            'transparent',
        ] as const;
    }, [theme]);

    const gradientStyle = useMemo(() => [style.shimmerContainer, shimmerAnimatedStyle], [shimmerAnimatedStyle, style.shimmerContainer]);

    if (!hasBeenDeleted) {
        body = (
            <View style={style.messageBody}>
                {message}
                {hasContent &&
                <Content
                    isReplyPost={isReplyPost}
                    layoutWidth={layoutWidth}
                    location={location}
                    post={post}
                    theme={theme}
                />
                }
                {hasFiles &&
                <Files
                    failed={isFailed}
                    layoutWidth={layoutWidth}
                    location={location}
                    post={post}
                    isReplyPost={isReplyPost}
                />
                }
                {(acknowledgementsVisible || reactionsVisible) && (
                    <View style={style.ackAndReactionsContainer}>
                        {acknowledgementsVisible && (
                            <Acknowledgements
                                hasReactions={hasReactions}
                                location={location}
                                post={post}
                                theme={theme}
                            />
                        )}
                        {reactionsVisible && (
                            <Reactions
                                location={location}
                                post={post}
                                theme={theme}
                            />
                        )}
                    </View>
                )}
                {isTranslating && (
                    <Animated.View
                        style={gradientStyle}
                        pointerEvents='none'
                    >
                        <LinearGradient
                            colors={gradientColors}
                            locations={gradientSettings.locations}
                            start={gradientSettings.start}
                            end={gradientSettings.end}
                            style={style.shimmerGradient}
                        />
                    </Animated.View>
                )}
            </View>
        );
    }

    return (
        <View
            style={style.messageContainerWithReplyBar}
            onLayout={onLayout}
        >
            <View style={replyBarStyle}/>
            {body}
            {isFailed &&
            <Failed
                post={post}
                theme={theme}
            />
            }
        </View>
    );
};

export default Body;
