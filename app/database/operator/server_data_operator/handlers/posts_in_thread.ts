// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';

import {Database} from '@constants';
import {getPostListEdges} from '@database//operator/utils/post';
import {transformPostInThreadRecord} from '@database/operator/server_data_operator/transformers/post';
import {getRawRecordPairs, getValidRecordsForUpdate} from '@database/operator/utils/general';

import type {RecordPair} from '@typings/database/database';
import type PostsInThreadModel from '@typings/database/models/servers/posts_in_thread';

export interface PostsInThreadHandlerMix {
    handleReceivedPostsInThread: (postsMap: Record<string, Post[]>, prepareRecordsOnly?: boolean) => Promise<PostsInThreadModel[]>;
}

const {POSTS_IN_THREAD} = Database.MM_TABLES.SERVER;

const PostsInThreadHandler = (superclass: any) => class extends superclass {
    handleReceivedPostsInThread = async (postsMap: Record<string, Post[]>, prepareRecordsOnly = false): Promise<PostsInThreadModel[]> => {
        if (!postsMap || !Object.keys(postsMap).length) {
            // eslint-disable-next-line no-console
            console.warn(
                'An empty or undefined "postsMap" object has been passed to the handleReceivedPostsInThread method',
            );
            return [];
        }

        const update: RecordPair[] = [];
        const create: PostsInThread[] = [];
        const ids = Object.keys(postsMap);
        for await (const rootId of ids) {
            const {firstPost, lastPost} = getPostListEdges(postsMap[rootId]);
            const chunks = (await this.database.get(POSTS_IN_THREAD).query(
                Q.where('root_id', rootId),
                Q.sortBy('latest', Q.desc),
            ).fetch()) as PostsInThreadModel[];

            if (chunks.length) {
                const chunk = chunks[0];
                const newValue = {
                    root_id: rootId,
                    earliest: Math.min(chunk.earliest, firstPost.create_at),
                    latest: Math.max(chunk.latest, lastPost.create_at),
                };
                update.push(getValidRecordsForUpdate({
                    tableName: POSTS_IN_THREAD,
                    newValue,
                    existingRecord: chunk,
                }));
            } else {
                // create chunk
                create.push({
                    root_id: rootId,
                    earliest: firstPost.create_at,
                    latest: lastPost.create_at,
                });
            }
        }

        const postInThreadRecords = (await this.prepareRecords({
            createRaws: getRawRecordPairs(create),
            updateRaws: update,
            transformer: transformPostInThreadRecord,
            tableName: POSTS_IN_THREAD,
        })) as PostsInThreadModel[];

        if (postInThreadRecords?.length && !prepareRecordsOnly) {
            await this.batchRecords(postInThreadRecords);
        }

        return postInThreadRecords;
    };
};

export default PostsInThreadHandler;
