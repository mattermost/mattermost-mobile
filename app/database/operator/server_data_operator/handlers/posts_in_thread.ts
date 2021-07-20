// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';

import {Database} from '@constants';
import {getRawRecordPairs, retrieveRecords} from '@database/operator/utils/general';
import {transformPostInThreadRecord} from '@database/operator/server_data_operator/transformers/post';
import {getPostListEdges} from '@database//operator/utils/post';

import type PostsInThreadModel from '@typings/database/models/servers/posts_in_thread';

export interface PostsInThreadHandlerMix {
    handleReceivedPostsInThread: (postsMap: Record<string, Post[]>, prepareRecordsOnly?: boolean) => Promise<PostsInThreadModel[]>;
    handleReceivedPostForThread: (post: Post, prepareRecordsOnly?: boolean) => Promise<PostsInThreadModel[]>;
}

const {POSTS_IN_THREAD} = Database.MM_TABLES.SERVER;

const PostsInThreadHandler = (superclass: any) => class extends superclass {
    handleReceivedPostsInThread = async (postsMap: Record<string, Post[]>, prepareRecordsOnly = false): Promise<PostsInThreadModel[]> => {
        if (!Object.keys(postsMap).length) {
            return [];
        }

        const update: PostsInThread[] = [];
        const create: PostsInThread[] = [];
        const ids = Object.keys(postsMap);
        for await (const rootId of ids) {
            const {firstPost, lastPost} = getPostListEdges(postsMap[rootId]);
            const chunks = (await retrieveRecords({
                database: this.database,
                tableName: POSTS_IN_THREAD,
                condition: Q.where('id', rootId),
            })) as PostsInThreadModel[];

            if (chunks.length) {
                const chunk = chunks[0];
                update.push({
                    id: rootId,
                    earliest: Math.min(chunk.earliest, firstPost.create_at),
                    latest: Math.max(chunk.latest, lastPost.create_at),
                });
            } else {
                // create chunk
                create.push({
                    id: rootId,
                    earliest: firstPost.create_at,
                    latest: lastPost.create_at,
                });
            }
        }

        const postInThreadRecords = (await this.prepareRecords({
            createRaws: getRawRecordPairs(create),
            updateRaws: getRawRecordPairs(update),
            transformer: transformPostInThreadRecord,
            tableName: POSTS_IN_THREAD,
        })) as PostsInThreadModel[];

        if (postInThreadRecords?.length && !prepareRecordsOnly) {
            await this.batchRecords(postInThreadRecords);
        }

        return postInThreadRecords;
    };

    handleReceivedPostForThread = async (post: Post, prepareRecordsOnly = false): Promise<PostsInThreadModel[]> => {
        throw new Error(`handleReceivedPostForThread Not implemented yet. postId ${post.id} prepareRecordsOnly=${prepareRecordsOnly}`);
    }
};

export default PostsInThreadHandler;
