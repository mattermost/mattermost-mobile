// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useState} from 'react';
import {useIntl} from 'react-intl';
import {type LayoutChangeEvent, View} from 'react-native';

import Files from '@components/files';
import FormattedText from '@components/formatted_text';
import JumboEmoji from '@components/jumbo_emoji';
import ErrorBoundary from '@components/markdown/error_boundary';
import {Screens} from '@constants';
import StatusUpdatePost from '@playbooks/components/status_update_post';
import {PLAYBOOKS_UPDATE_STATUS_POST_TYPE} from '@playbooks/constants/plugin';
import {isEdited as postEdited, isPostFailed, hasInteractivePostContent} from '@utils/post';
import {makeStyleSheetFromTheme} from '@utils/theme';

import Acknowledgements from './acknowledgements';
import AddMembers from './add_members';
import Content from './content';
import Failed from './failed';
import Message from './message';
import Reactions from './reactions';

import type PostModel from '@typings/database/models/servers/post';
import type {SearchPattern} from '@typings/global/markdown';
import type {AvailableScreens} from '@typings/screens/navigation';

type BodyProps = {
    appsEnabled: boolean;
    mmBlocksEnabled: boolean;
    filesInfo: FileInfo[];
    hasReactions: boolean;
    highlight: boolean;
    isJumboEmoji: boolean;
    isPendingOrFailed: boolean;
    isPostAcknowledgementEnabled?: boolean;
    isPostAddChannelMember: boolean;
    isReplyPost: boolean;
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
        },
        messageBody: {
            paddingVertical: 2,
            gap: 10,
            flex: 1,
        },
        messageContainer: {width: '100%'},
        message: {
            color: theme.centerChannelColor,
            fontSize: 15,
            lineHeight: 20,
        },
        bodyContainer: {
            flexDirection: 'row',
            width: '100%',
        },
    };
});

const Body = ({
    appsEnabled,
    mmBlocksEnabled,
    filesInfo,
    hasReactions,
    highlight,
    isJumboEmoji,
    isPendingOrFailed,
    isPostAcknowledgementEnabled,
    isPostAddChannelMember,
    isReplyPost,
    location,
    post,
    searchPatterns,
    showAddReaction,
    theme,
    isChannelAutotranslated,
}: BodyProps) => {
    const intl = useIntl();
    const style = getStyleSheet(theme);
    const isEdited = postEdited(post);
    const isFailed = isPostFailed(post);
    const [layoutWidth, setLayoutWidth] = useState(0);
    const hasBeenDeleted = Boolean(post.deleteAt);
    let body;
    let message;

    const nBindings = Array.isArray(post.props?.app_bindings) ? post.props?.app_bindings.length : 0;
    const nAttachments = Array.isArray(post.props?.attachments) ? post.props?.attachments.length : 0;

    const hasContent = Boolean(
        post.metadata?.embeds?.length ||
        (appsEnabled && nBindings) ||
        hasInteractivePostContent(post, mmBlocksEnabled) ||
        (!mmBlocksEnabled && nAttachments),
    );

    const onLayout = useCallback((e: LayoutChangeEvent) => {
        if (location === Screens.SAVED_MESSAGES) {
            setLayoutWidth(e.nativeEvent.layout.width);
        }
    }, [location]);

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

    if (!hasBeenDeleted) {
        body = (
            <View style={style.messageBody}>
                {message}
                {hasContent &&
                <Content
                    isReplyPost={isReplyPost}
                    layoutWidth={layoutWidth}
                    location={location}
                    mmBlocksEnabled={mmBlocksEnabled}
                    post={post}
                    theme={theme}
                />
                }
                {Boolean(filesInfo.length) &&
                <Files
                    failed={isFailed}
                    filesInfo={filesInfo}
                    layoutWidth={layoutWidth}
                    location={location}
                    postId={post.id}
                    postProps={post.props ?? undefined}
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
            </View>
        );
    }
    return (
        <ErrorBoundary
            error={intl.formatMessage({id: 'post.error', defaultMessage: 'There has been an error rendering this post.'})}
            theme={theme}
        >
            <View
                style={style.bodyContainer}
                onLayout={onLayout}
            >
                {body}
                {isFailed &&
                <Failed
                    post={post}
                    theme={theme}
                />
                }
            </View>
        </ErrorBoundary>
    );
};

export default Body;
