// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {isMessageAttachmentArray} from '@utils/message_attachment';
import {isYoutubeLink} from '@utils/url';

import EmbeddedBindings from './embedded_bindings';
import ImagePreview from './image_preview';
import MessageAttachments from './message_attachments';
import Opengraph from './opengraph';
import YouTube from './youtube';

import type PostModel from '@typings/database/models/servers/post';
import type {AvailableScreens} from '@typings/screens/navigation';

type ContentProps = {
    isReplyPost: boolean;
    layoutWidth?: number;
    location: AvailableScreens;
    post: PostModel;
    theme: Theme;
}

const contentType: Record<string, string> = {
    app_bindings: 'app_bindings',
    image: 'image',
    message_attachment: 'message_attachment',
    opengraph: 'opengraph',
    youtube: 'youtube',
};

const Content = ({isReplyPost, layoutWidth, location, post, theme}: ContentProps) => {
    let type: string | undefined = post.metadata?.embeds?.[0].type;

    const nAppBindings = Array.isArray(post.props?.app_bindings) ? post.props.app_bindings.length : 0;
    if (!type && nAppBindings) {
        type = contentType.app_bindings;
    }

    if (!type) {
        return null;
    }

    const attachments = isMessageAttachmentArray(post.props?.attachments) ? post.props.attachments : [];

    switch (contentType[type]) {
        case contentType.image:
            return (
                <ImagePreview
                    isReplyPost={isReplyPost}
                    layoutWidth={layoutWidth}
                    location={location}
                    metadata={post.metadata}
                    postId={post.id}
                    theme={theme}
                />
            );
        case contentType.opengraph:
            if (isYoutubeLink(post.metadata!.embeds![0].url)) {
                return (
                    <YouTube
                        isReplyPost={isReplyPost}
                        layoutWidth={layoutWidth}
                        metadata={post.metadata}
                    />
                );
            }

            return (
                <Opengraph
                    isReplyPost={isReplyPost}
                    layoutWidth={layoutWidth}
                    location={location}
                    metadata={post.metadata}
                    postId={post.id}
                    removeLinkPreview={post.props?.remove_link_preview === 'true'}
                    theme={theme}
                />
            );
        case contentType.message_attachment:
            if (attachments.length) {
                return (
                    <MessageAttachments
                        attachments={attachments}
                        channelId={post.channelId}
                        layoutWidth={layoutWidth}
                        location={location}
                        metadata={post.metadata}
                        postId={post.id}
                        theme={theme}
                    />
                );
            }
            break;
        case contentType.app_bindings:
            if (nAppBindings) {
                return (
                    <EmbeddedBindings
                        location={location}
                        post={post}
                        theme={theme}
                    />
                );
            }
            break;
    }

    return null;
};

export default Content;
