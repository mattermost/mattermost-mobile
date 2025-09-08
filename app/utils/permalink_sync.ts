// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database} from '@nozbe/watermelondb';

import {queryPostsWithPermalinkReferences} from '@queries/servers/post';
import {logDebug, logWarning} from '@utils/log';

import type PostModel from '@typings/database/models/servers/post';

/**
 * Find posts that contain permalink previews referencing the given post ID
 */
export async function findPostsWithPermalinkReferences(
    database: Database,
    referencedPostId: string,
): Promise<PostModel[]> {
    try {
        const referencingPosts = await queryPostsWithPermalinkReferences(database, referencedPostId);
        return referencingPosts;
    } catch (error) {
        logWarning('Error finding posts with permalink references:', error);
        return [];
    }
}

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

/**
 * Synchronize permalink previews when a post is edited
 */
export async function syncPermalinkPreviewsForEditedPost(
    database: Database,
    editedPost: Post,
): Promise<PostModel[]> {
    try {
        const referencingPosts = await findPostsWithPermalinkReferences(
            database,
            editedPost.id,
        );

        if (!referencingPosts.length) {
            return [];
        }

        const updatedPosts: PostModel[] = [];
        for (const referencingPost of referencingPosts) {
            const updatedPost = updatePermalinkMetadata(
                referencingPost,
                editedPost.id,
                editedPost,
            );

            if (updatedPost) {
                updatedPosts.push(updatedPost);
            }
        }

        logDebug(`Updated ${updatedPosts.length} permalink previews for edited post ${editedPost.id}`);
        return updatedPosts;
    } catch (error) {
        logWarning('Error syncing permalink previews for edited post:', error);
        return [];
    }
}

