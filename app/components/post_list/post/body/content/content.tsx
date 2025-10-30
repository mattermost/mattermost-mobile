// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
/*eslint-disable*/
import React from 'react';
import {View} from 'react-native';

import {isMessageAttachmentArray} from '@utils/message_attachment';
import {isYoutubeLink} from '@utils/url';

import EmbeddedBindings from './embedded_bindings';
import ImagePreview from './image_preview';
import MessageAttachments from './message_attachments';
import Opengraph from './opengraph';
import PermalinkPreview from './permalink_preview';
import YouTube from './youtube';

import type PostModel from '@typings/database/models/servers/post';
import type {AvailableScreens} from '@typings/screens/navigation';

type ContentProps = {
    isMyPost?: boolean;
    isReplyPost: boolean;
    layoutWidth?: number;
    location: AvailableScreens;
    post: PostModel;
    theme: Theme;
    showPermalinkPreviews: boolean;
}

const contentType: Record<string, string> = {
    app_bindings: 'app_bindings',
    image: 'image',
    message_attachment: 'message_attachment',
    opengraph: 'opengraph',
    permalink: 'permalink',
    youtube: 'youtube',
};

const Content = ({isMyPost, isReplyPost, layoutWidth, location, post, theme, showPermalinkPreviews}: ContentProps) => {
    let type: string | undefined = post.metadata?.embeds?.[0].type;

    const nAppBindings = Array.isArray(post.props?.app_bindings) ? post.props.app_bindings.length : 0;
    if (!type && nAppBindings) {
        type = contentType.app_bindings;
    }

    if (!type) {
        return null;
    }

    const attachments = isMessageAttachmentArray(post.props?.attachments) ? post.props.attachments : [];

    let content;

    switch (contentType[type]) {
        case contentType.image:
            content = (
                <ImagePreview
                    isReplyPost={isReplyPost}
                    layoutWidth={layoutWidth}
                    location={location}
                    metadata={post.metadata}
                    postId={post.id}
                    theme={theme}
                />
            );
            break;
        case contentType.opengraph:
            if (isYoutubeLink(post.metadata!.embeds![0].url)) {
                content = (
                    <YouTube
                        isReplyPost={isReplyPost}
                        layoutWidth={layoutWidth}
                        metadata={post.metadata}
                    />
                );
            } else {
                content = (
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
            }
            break;
        case contentType.message_attachment:
            if (attachments.length) {
                content = (
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
                content = (
                    <EmbeddedBindings
                        location={location}
                        post={post}
                        theme={theme}
                    />
                );
            }
            break;
        case contentType.permalink:
            if (showPermalinkPreviews) {
                content = (
                <PermalinkPreview
                    embedData={post.metadata!.embeds![0].data as PermalinkEmbedData}
                    location={location}
                    parentLocation={location}
                    parentPostId={post.id} 
                    />
                );
            }
            break;
    }

    if (!content) {
        return null;
    }

    // Use marginLeft: 'auto' to push content right WITHOUT affecting internal layout
    if (isMyPost) {
        return (
            <View style={{marginLeft: 'auto'}}>
                {content}
            </View>
        );
    }

    return content;
};

export default Content;
