// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Post} from '@constants';

import {
    isBoRPost,
    isUnrevealedBoRPost,
    isOwnBoRPost,
    isExpiredBoRPost,
} from './bor';

import type PostModel from '@typings/database/models/servers/post';
import type UserModel from '@typings/database/models/servers/user';

describe('BoR utility functions', () => {
    const mockUser: UserModel = {
        id: 'user123',
    } as UserModel;

    describe('isBoRPost', () => {
        it('should return true for BoR posts', () => {
            const borPost: PostModel = {
                type: Post.POST_TYPES.BURN_ON_READ,
            } as PostModel;

            expect(isBoRPost(borPost)).toBe(true);
        });

        it('should return false for non-BoR posts', () => {
            const regularPost: PostModel = {
                type: Post.POST_TYPES.CHANNEL_DELETED,
            } as PostModel;

            expect(isBoRPost(regularPost)).toBe(false);
        });

        it('should return false for posts without type', () => {
            const postWithoutType: PostModel = {} as PostModel;

            expect(isBoRPost(postWithoutType)).toBe(false);
        });
    });

    describe('isUnrevealedBoRPost', () => {
        it('should return true for BoR posts without expire_at in metadata', () => {
            const unrevealedBorPost: PostModel = {
                type: Post.POST_TYPES.BURN_ON_READ,
                metadata: {},
            } as PostModel;

            expect(isUnrevealedBoRPost(unrevealedBorPost)).toBe(true);
        });

        it('should return true for BoR posts with null metadata', () => {
            const borPostWithNullMetadata: PostModel = {
                type: Post.POST_TYPES.BURN_ON_READ,
                metadata: null,
            } as PostModel;

            expect(isUnrevealedBoRPost(borPostWithNullMetadata)).toBe(true);
        });

        it('should return false for BoR posts with expire_at in metadata', () => {
            const revealedBorPost: PostModel = {
                type: Post.POST_TYPES.BURN_ON_READ,
                metadata: {
                    expire_at: Date.now() + 10000,
                },
            } as PostModel;

            expect(isUnrevealedBoRPost(revealedBorPost)).toBe(false);
        });

        it('should return true for BoR posts with expire_at in the past', () => {
            const revealedBorPost: PostModel = {
                type: Post.POST_TYPES.BURN_ON_READ,
                metadata: {
                    expire_at: Date.now() - 10000,
                },
            } as PostModel;

            expect(isUnrevealedBoRPost(revealedBorPost)).toBe(false);
        });

        it('should return false for non-BoR posts', () => {
            const regularPost: PostModel = {
                type: '',
                metadata: {},
            } as PostModel;

            expect(isUnrevealedBoRPost(regularPost)).toBe(false);
        });
    });

    describe('isOwnBoRPost', () => {
        it('should return true for BoR posts owned by current user', () => {
            const ownBorPost: PostModel = {
                type: Post.POST_TYPES.BURN_ON_READ,
                userId: 'user123',
            } as PostModel;

            expect(isOwnBoRPost(ownBorPost, mockUser)).toBe(true);
        });

        it('should return false for BoR posts not owned by current user', () => {
            const othersBorPost: PostModel = {
                type: Post.POST_TYPES.BURN_ON_READ,
                userId: 'user456',
            } as PostModel;

            expect(isOwnBoRPost(othersBorPost, mockUser)).toBe(false);
        });

        it('should return false for non-BoR posts', () => {
            const ownRegularPost: PostModel = {
                type: '',
                userId: 'user123',
            } as PostModel;

            expect(isOwnBoRPost(ownRegularPost, mockUser)).toBe(false);
        });

        it('should return false when no current user is provided', () => {
            const borPost: PostModel = {
                type: Post.POST_TYPES.BURN_ON_READ,
                userId: 'user123',
            } as PostModel;

            expect(isOwnBoRPost(borPost)).toBe(false);
            expect(isOwnBoRPost(borPost, undefined)).toBe(false);
        });
    });

    describe('isExpiredBoRPost', () => {
        const pastTime = Date.now() - 10000;
        const futureTime = Date.now() + 10000;

        it('should return true for BoR posts expired for all users (props.expire_at)', () => {
            const expiredBorPost: PostModel = {
                type: Post.POST_TYPES.BURN_ON_READ,
                props: {
                    expire_at: pastTime,
                } as PostMetadata,
            } as PostModel;

            expect(isExpiredBoRPost(expiredBorPost)).toBe(true);
        });

        it('should return true for BoR posts expired for current user (metadata.expire_at)', () => {
            const expiredBorPost: PostModel = {
                type: Post.POST_TYPES.BURN_ON_READ,
                metadata: {
                    expire_at: pastTime,
                },
            } as PostModel;

            expect(isExpiredBoRPost(expiredBorPost)).toBe(true);
        });

        it('should return false for BoR posts not yet expired', () => {
            const activeBorPost: PostModel = {
                type: Post.POST_TYPES.BURN_ON_READ,
                props: {
                    expire_at: futureTime,
                } as Record<string, unknown>,
                metadata: {
                    expire_at: futureTime,
                } as PostMetadata,
            } as PostModel;

            expect(isExpiredBoRPost(activeBorPost)).toBe(false);
        });

        it('should return false for non-BoR posts even with expired timestamps', () => {
            const expiredRegularPost: PostModel = {
                type: '',
                props: {
                    expire_at: pastTime,
                } as Record<string, unknown>,
                metadata: {
                    expire_at: pastTime,
                } as PostMetadata,
            } as PostModel;

            expect(isExpiredBoRPost(expiredRegularPost)).toBe(false);
        });

        it('should return false for BoR posts without expiration data', () => {
            const borPostWithoutExpiration: PostModel = {
                type: Post.POST_TYPES.BURN_ON_READ,
            } as PostModel;

            expect(isExpiredBoRPost(borPostWithoutExpiration)).toBe(false);
        });

        it('should handle string expire_at values in props', () => {
            const expiredBorPostWithStringTime: PostModel = {
                type: Post.POST_TYPES.BURN_ON_READ,
                props: {
                    expire_at: pastTime.toString(),
                } as Record<string, unknown>,
            } as PostModel;

            expect(isExpiredBoRPost(expiredBorPostWithStringTime)).toBe(true);
        });
    });
});
