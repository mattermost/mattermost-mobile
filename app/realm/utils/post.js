// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {General} from 'app/constants';

export function postDataToRealm(post, owner) {
    const postData = {
        id: post.id,
        channelId: post.channel_id,
        createAt: post.create_at,
        updateAt: post.update_at,
        deleteAt: post.delete_at,
        editAt: post.edit_at,
        user: owner,
        rootId: post.root_id,
        originalId: post.original_id,
        pendingPostId: post.pending_post_id,
        message: post.message,
        type: post.type,
        props: post.props ? JSON.stringify(post.props) : '',
        embeds: [],
        files: [],
        hasReactions: post.has_reactions,
        isPinned: post.is_pinned,
        images: [],
        reactions: [],
    };

    if (post.metadata?.files) {
        post.metadata.files.forEach((f) => {
            postData.files.push({
                id: f.id,
                name: f.name,
                extension: f.extension,
                mimeType: f.mime_type,
                size: f.size,
                createAt: f.create_at,
                updateAt: f.update_at,
                deleteAt: f.delete_at,
                width: f.width || 0,
                height: f.height || 0,
                hasPreviewImage: f.has_preview_image || false,
            });
        });
    }

    if (post.metadata?.reactions) {
        post.metadata.reactions.forEach((r) => {
            const id = `${post.id}-${owner?.id}-${r.emoji_name}`;
            postData.reactions.push({
                id,
                user: r.user_id,
                name: r.emoji_name,
                createAt: r.create_at,
            });
        });
    }

    if (post.metadata?.images) {
        Object.keys(post.metadata.images).forEach((url) => {
            const img = post.metadata.images[url];
            postData.images.push({
                url,
                width: img.width,
                height: img.height,
                format: img.format,
                frameCount: img.frame_count,
            });
        });
    }

    if (post.metadata?.embeds) {
        post.metadata.embeds.forEach((e) => {
            postData.embeds.push({
                type: e.type,
                url: e.url || '',
                data: e.data ? JSON.stringify(e.data) : null,
            });
        });
    }

    return postData;
}

export function getNeededAtMentionedUsernames(allUsers, posts) {
    const usernamesToLoad = new Set();
    const pattern = /\B@(([a-z0-9_.-]*[a-z0-9_])[.-]*)/gi;

    posts.forEach((post) => {
        if (!post.message.includes('@')) {
            return;
        }

        let match;
        while ((match = pattern.exec(post.message)) !== null) {
            // match[1] is the matched mention including trailing punctuation
            // match[2] is the matched mention without trailing punctuation
            if (General.SPECIAL_MENTIONS.indexOf(match[2]) !== -1) {
                continue;
            }

            const user = allUsers.filtered('username=$0 OR username=$1', match[1], match[2])[0];
            if (user) {
                // We have the user, go to the next match
                continue;
            }

            // If there's no trailing punctuation, this will only add 1 item to the set
            usernamesToLoad.add(match[1]);
            usernamesToLoad.add(match[2]);
        }
    });

    return usernamesToLoad;
}
