// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import assert from 'assert';

import * as Actions from 'service/actions/posts';
import Client from 'service/client';
import configureStore from 'app/store';
import {Constants, RequestStatus} from 'service/constants';
import TestHelper from 'test/test_helper';

describe('Actions.Posts', () => {
    it('createPost', (done) => {
        TestHelper.initBasic(Client).then(() => {
            const store = configureStore();

            const channelId = TestHelper.basicChannel.id;
            const post = TestHelper.fakePost(channelId);

            store.subscribe(() => {
                const state = store.getState();
                const createRequest = state.requests.posts.createPost;
                const {posts, postsByChannel} = state.entities.posts;

                if (createRequest.status === RequestStatus.SUCCESS) {
                    assert.ok(posts);
                    assert.ok(postsByChannel);
                    assert.ok(postsByChannel[channelId]);

                    let found = false;
                    for (const storedPost of Object.values(posts)) {
                        if (storedPost.message === post.message) {
                            found = true;
                            break;
                        }
                    }
                    assert.ok(found, 'failed to find new post in posts');

                    found = false;
                    for (const postIdInChannel of postsByChannel[channelId]) {
                        if (posts[postIdInChannel].message === post.message) {
                            found = true;
                            break;
                        }
                    }
                    assert.ok(found, 'failed to find new post in postsByChannel');

                    done();
                } else if (createRequest.status === RequestStatus.FAILURE) {
                    done(new Error(JSON.stringify(createRequest.error)));
                }
            });

            Actions.createPost(
                TestHelper.basicTeam.id,
                post
            )(store.dispatch, store.getState);
        });
    });

    it('editPost', (done) => {
        TestHelper.initBasic(Client).then(async () => {
            const store = configureStore();

            const teamId = TestHelper.basicTeam.id;
            const channelId = TestHelper.basicChannel.id;

            const post = await Client.createPost(
                teamId,
                TestHelper.fakePost(channelId)
            );
            const message = post.message;

            store.subscribe(() => {
                const state = store.getState();
                const editRequest = state.requests.posts.editPost;
                const posts = state.entities.posts.posts;

                if (editRequest.status === RequestStatus.SUCCESS) {
                    assert.ok(posts);
                    assert.ok(posts[post.id]);

                    assert.strictEqual(
                        posts[post.id].message,
                        `${message} (edited)`
                    );

                    done();
                } else if (editRequest.status === RequestStatus.FAILURE) {
                    done(new Error(JSON.stringify(editRequest.error)));
                }
            });

            post.message = `${message} (edited)`;
            Actions.editPost(
                teamId,
                post
            )(store.dispatch, store.getState);
        });
    });

    it('deletePost', (done) => {
        TestHelper.initBasic(Client).then(async () => {
            const store = configureStore();

            const teamId = TestHelper.basicTeam.id;
            const channelId = TestHelper.basicChannel.id;

            await Actions.createPost(
                teamId,
                TestHelper.fakePost(channelId)
            )(store.dispatch, store.getState);

            const initialPosts = store.getState().entities.posts;
            const created = initialPosts.posts[initialPosts.postsByChannel[channelId][0]];

            store.subscribe(() => {
                const state = store.getState();
                const deleteRequest = state.requests.posts.deletePost;
                const posts = state.entities.posts.posts;

                if (deleteRequest.status === RequestStatus.SUCCESS) {
                    assert.ok(posts);
                    assert.ok(posts[created.id]);

                    assert.strictEqual(
                        posts[created.id].state,
                        Constants.POST_DELETED
                    );

                    done();
                } else if (deleteRequest.status === RequestStatus.FAILURE) {
                    done(new Error(JSON.stringify(deleteRequest.error)));
                }
            });

            Actions.deletePost(teamId, created)(store.dispatch, store.getState);
        });
    });

    it('removePost', (done) => {
        TestHelper.initBasic(Client).then(async () => {
            const store = configureStore();

            const teamId = TestHelper.basicTeam.id;
            const channelId = TestHelper.basicChannel.id;
            const postId = TestHelper.basicPost.id;

            const post1a = await Client.createPost(
                teamId,
                {...TestHelper.fakePost(channelId), root_id: postId}
            );

            await Actions.getPosts(
                teamId,
                channelId
            )(store.dispatch, store.getState);

            store.subscribe(() => {
                const state = store.getState();
                const {posts, postsByChannel} = state.entities.posts;

                assert.ok(posts);
                assert.ok(postsByChannel);
                assert.ok(postsByChannel[channelId]);

                assert.equal(postsByChannel[channelId].length, 0);
                assert.ok(!posts[postId]);
                assert.ok(!posts[post1a.id]);

                done();
            });

            Actions.removePost(
                TestHelper.basicPost
            )(store.dispatch, store.getState);
        });
    });

    it('getPost', (done) => {
        TestHelper.initBasic(Client).then(async () => {
            const store = configureStore();

            const teamId = TestHelper.basicTeam.id;
            const channelId = TestHelper.basicChannel.id;

            const post = await Client.createPost(
                teamId,
                TestHelper.fakePost(channelId)
            );

            store.subscribe(() => {
                const state = store.getState();
                const getRequest = state.requests.posts.getPost;
                const {posts, postsByChannel} = state.entities.posts;

                if (getRequest.status === RequestStatus.SUCCESS) {
                    assert.ok(posts);
                    assert.ok(postsByChannel);
                    assert.ok(postsByChannel[channelId]);

                    assert.ok(posts[post.id]);

                    let found = false;
                    for (const postIdInChannel of postsByChannel[channelId]) {
                        if (postIdInChannel === post.id) {
                            found = true;
                            break;
                        }
                    }
                    assert.ok(found, 'failed to find post in postsByChannel');

                    done();
                } else if (getRequest.status === RequestStatus.FAILURE) {
                    done(new Error(JSON.stringify(getRequest.error)));
                }
            });

            Actions.getPost(
                teamId,
                channelId,
                post.id
            )(store.dispatch, store.getState);
        });
    });

    it('getPosts', (done) => {
        TestHelper.initBasic(Client).then(async () => {
            const store = configureStore();

            const teamId = TestHelper.basicTeam.id;
            const channelId = TestHelper.basicChannel.id;

            const post1 = await Client.createPost(
                teamId,
                TestHelper.fakePost(channelId)
            );
            const post1a = await Client.createPost(
                teamId,
                {...TestHelper.fakePost(channelId), root_id: post1.id}
            );
            const post2 = await Client.createPost(
                teamId,
                TestHelper.fakePost(channelId)
            );
            const post3 = await Client.createPost(
                teamId,
                TestHelper.fakePost(channelId)
            );
            const post3a = await Client.createPost(
                teamId,
                {...TestHelper.fakePost(channelId), root_id: post3.id}
            );

            store.subscribe(() => {
                const state = store.getState();
                const getRequest = state.requests.posts.getPosts;
                const {posts, postsByChannel} = state.entities.posts;

                if (getRequest.status === RequestStatus.SUCCESS) {
                    assert.ok(posts);
                    assert.ok(postsByChannel);

                    const postsInChannel = postsByChannel[channelId];
                    assert.ok(postsInChannel);
                    assert.equal(postsInChannel[0], post3a.id, 'wrong order for post3a');
                    assert.equal(postsInChannel[1], post3.id, 'wrong order for post3');
                    assert.equal(postsInChannel[3], post1a.id, 'wrong order for post1a');

                    assert.ok(posts[post1.id]);
                    assert.ok(posts[post1a.id]);
                    assert.ok(posts[post2.id]);
                    assert.ok(posts[post3.id]);
                    assert.ok(posts[post3a.id]);

                    done();
                } else if (getRequest.status === RequestStatus.FAILURE) {
                    done(new Error(JSON.stringify(getRequest.error)));
                }
            });

            Actions.getPosts(
                teamId,
                channelId
            )(store.dispatch, store.getState);
        });
    }).timeout(3000);

    it('getPostsSince', (done) => {
        TestHelper.initBasic(Client).then(async () => {
            const store = configureStore();

            const teamId = TestHelper.basicTeam.id;
            const channelId = TestHelper.basicChannel.id;

            const post1 = await Client.createPost(
                teamId,
                TestHelper.fakePost(channelId)
            );
            await Client.createPost(
                teamId,
                {...TestHelper.fakePost(channelId), root_id: post1.id}
            );
            const post2 = await Client.createPost(
                teamId,
                TestHelper.fakePost(channelId)
            );
            const post3 = await Client.createPost(
                teamId,
                TestHelper.fakePost(channelId)
            );
            const post3a = await Client.createPost(
                teamId,
                {...TestHelper.fakePost(channelId), root_id: post3.id}
            );

            store.subscribe(() => {
                const state = store.getState();
                const getRequest = state.requests.posts.getPostsSince;
                const {posts, postsByChannel} = state.entities.posts;

                if (getRequest.status === RequestStatus.SUCCESS) {
                    assert.ok(posts);
                    assert.ok(postsByChannel);

                    const postsInChannel = postsByChannel[channelId];
                    assert.ok(postsInChannel);
                    assert.equal(postsInChannel[0], post3a.id, 'wrong order for post3a');
                    assert.equal(postsInChannel[1], post3.id, 'wrong order for post3');
                    assert.equal(postsInChannel.length, 2, 'wrong size');

                    done();
                } else if (getRequest.status === RequestStatus.FAILURE) {
                    done(new Error(JSON.stringify(getRequest.error)));
                }
            });

            Actions.getPostsSince(
                teamId,
                channelId,
                post2.create_at
            )(store.dispatch, store.getState);
        });
    }).timeout(3000);

    it('getPostsBefore', (done) => {
        TestHelper.initBasic(Client).then(async () => {
            const store = configureStore();

            const teamId = TestHelper.basicTeam.id;
            const channelId = TestHelper.basicChannel.id;

            const post1 = await Client.createPost(
                teamId,
                TestHelper.fakePost(channelId)
            );
            const post1a = await Client.createPost(
                teamId,
                {...TestHelper.fakePost(channelId), root_id: post1.id}
            );
            const post2 = await Client.createPost(
                teamId,
                TestHelper.fakePost(channelId)
            );
            const post3 = await Client.createPost(
                teamId,
                TestHelper.fakePost(channelId)
            );
            await Client.createPost(
                teamId,
                {...TestHelper.fakePost(channelId), root_id: post3.id}
            );

            store.subscribe(() => {
                const state = store.getState();
                const getRequest = state.requests.posts.getPostsBefore;
                const {posts, postsByChannel} = state.entities.posts;

                if (getRequest.status === RequestStatus.SUCCESS) {
                    assert.ok(posts);
                    assert.ok(postsByChannel);

                    const postsInChannel = postsByChannel[channelId];
                    assert.ok(postsInChannel);
                    assert.equal(postsInChannel[0], post1a.id, 'wrong order for post1a');
                    assert.equal(postsInChannel[1], post1.id, 'wrong order for post1');
                    assert.equal(postsInChannel.length, 3, 'wrong size');

                    done();
                } else if (getRequest.status === RequestStatus.FAILURE) {
                    done(new Error(JSON.stringify(getRequest.error)));
                }
            });

            Actions.getPostsBefore(
                teamId,
                channelId,
                post2.id,
                0,
                10
            )(store.dispatch, store.getState);
        });
    }).timeout(3000);

    it('getPostsAfter', (done) => {
        TestHelper.initBasic(Client).then(async () => {
            const store = configureStore();

            const teamId = TestHelper.basicTeam.id;
            const channelId = TestHelper.basicChannel.id;

            const post1 = await Client.createPost(
                teamId,
                TestHelper.fakePost(channelId)
            );
            await Client.createPost(
                teamId,
                {...TestHelper.fakePost(channelId), root_id: post1.id}
            );
            const post2 = await Client.createPost(
                teamId,
                TestHelper.fakePost(channelId)
            );
            const post3 = await Client.createPost(
                teamId,
                TestHelper.fakePost(channelId)
            );
            const post3a = await Client.createPost(
                teamId,
                {...TestHelper.fakePost(channelId), root_id: post3.id}
            );

            store.subscribe(() => {
                const state = store.getState();
                const getRequest = state.requests.posts.getPostsAfter;
                const {posts, postsByChannel} = state.entities.posts;

                if (getRequest.status === RequestStatus.SUCCESS) {
                    assert.ok(posts);
                    assert.ok(postsByChannel);

                    const postsInChannel = postsByChannel[channelId];
                    assert.ok(postsInChannel);
                    assert.equal(postsInChannel[0], post3a.id, 'wrong order for post3a');
                    assert.equal(postsInChannel[1], post3.id, 'wrong order for post3');
                    assert.equal(postsInChannel.length, 2, 'wrong size');

                    done();
                } else if (getRequest.status === RequestStatus.FAILURE) {
                    done(new Error(JSON.stringify(getRequest.error)));
                }
            });

            Actions.getPostsAfter(
                teamId,
                channelId,
                post2.id,
                0,
                10
            )(store.dispatch, store.getState);
        });
    }).timeout(3000);
});
