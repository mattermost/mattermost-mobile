// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {logWarning} from '@utils/log';

import type PostModel from '@typings/database/models/servers/post';

/**
 * Update permalink metadata with fresh post data
 */
export function updatePermalinkMetadata(
    referencingPost: PostModel,
    referencedPostId: string,
    freshPostData: Post,
): PostModel | null {
    try {
        const metadata = referencingPost.metadata;
        if (!metadata?.embeds?.length) {
            return null;
        }

        let updated = false;
        const updatedEmbeds = metadata.embeds.map((embed) => {
            if (embed.type === 'permalink' && embed.data?.post_id === referencedPostId) {
                const currentEditAt = embed.data.post?.edit_at || 0;
                const freshEditAt = freshPostData.edit_at || 0;

                if (freshEditAt > currentEditAt) {
                    updated = true;
                    return {
                        ...embed,
                        data: {
                            ...embed.data,
                            post: {
                                ...embed.data.post,
                                id: freshPostData.id,
                                message: freshPostData.message,
                                edit_at: freshPostData.edit_at,
                                update_at: freshPostData.update_at,
                                user_id: freshPostData.user_id,
                                create_at: freshPostData.create_at,
                                file_ids: freshPostData.file_ids,
                                metadata: freshPostData.metadata,
                            },
                        },
                    };
                }
            }
            return embed;
        });

        if (updated) {
            const updatedPost = referencingPost.prepareUpdate((post) => {
                post.metadata = {
                    ...metadata,
                    embeds: updatedEmbeds,
                };
            });
            return updatedPost;
        }

        return null;
    } catch (error) {
        logWarning('Error updating permalink metadata:', error);
        return null;
    }
}
