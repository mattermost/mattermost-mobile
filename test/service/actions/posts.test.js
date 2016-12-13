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

            store.subscribe(() => {
                const createRequest = store.getState().requests.posts.createPost;
                const postsInfo = store.getState().entities.posts.postsInfo;

                if (createRequest.status === RequestStatus.SUCCESS || createRequest.status === RequestStatus.FAILURE) {
                    if (createRequest.error) {
                        done(new Error(JSON.stringify(createRequest.error)));
                    } else {
                        assert.ok(postsInfo[TestHelper.basicChannel.id]);
                        assert.ok(postsInfo[TestHelper.basicChannel.id].order.length);
                        assert.ok(Object.keys(postsInfo[TestHelper.basicChannel.id].posts).length);
                        done();
                    }
                }
            });

            const post = TestHelper.fakePost(TestHelper.basicChannel.id);
            Actions.createPost(
                TestHelper.basicTeam.id,
                post
            )(store.dispatch, store.getState);
        });
    });

    it('editPost', (done) => {
        TestHelper.initBasic(Client).then(async () => {
            const store = configureStore();
            const post = await Client.createPost(
                TestHelper.basicTeam.id,
                TestHelper.fakePost(TestHelper.basicChannel.id)
            );
            const message = post.message;

            store.subscribe(() => {
                const editRequest = store.getState().requests.posts.editPost;
                const postsInfo = store.getState().entities.posts.postsInfo;

                if (editRequest.status === RequestStatus.SUCCESS || editRequest.status === RequestStatus.FAILURE) {
                    if (editRequest.error) {
                        done(new Error(JSON.stringify(editRequest.error)));
                    } else {
                        assert.ok(postsInfo[TestHelper.basicChannel.id]);
                        assert.ok(postsInfo[TestHelper.basicChannel.id].order.length);
                        assert.strictEqual(
                            postsInfo[TestHelper.basicChannel.id].posts[post.id].message,
                            `${message} (edited)`
                        );
                        done();
                    }
                }
            });

            post.message = `${message} (edited)`;
            Actions.editPost(
                TestHelper.basicTeam.id,
                post
            )(store.dispatch, store.getState);
        });
    });

    it('deletePost', (done) => {
        TestHelper.initBasic(Client).then(async () => {
            const store = configureStore();
            let created;

            store.subscribe(() => {
                const createRequest = store.getState().requests.posts.createPost;
                const deleteRequest = store.getState().requests.posts.deletePost;
                const postsInfo = store.getState().entities.posts.postsInfo;

                if (deleteRequest.status === RequestStatus.SUCCESS || deleteRequest.status === RequestStatus.FAILURE) {
                    if (deleteRequest.error) {
                        done(new Error(JSON.stringify(deleteRequest.error)));
                    } else {
                        assert.ok(postsInfo[TestHelper.basicChannel.id]);
                        assert.strictEqual(
                            postsInfo[TestHelper.basicChannel.id].posts[created.id].state,
                            Constants.POST_DELETED
                        );
                        done();
                    }
                }

                if (deleteRequest.status === RequestStatus.NOT_STARTED &&
                    (createRequest.status === RequestStatus.SUCCESS || createRequest.status === RequestStatus.FAILURE)) {
                    if (createRequest.error) {
                        done(new Error(JSON.stringify(createRequest.error)));
                    } else {
                        const posts = postsInfo[TestHelper.basicChannel.id].posts;
                        created = posts[Object.keys(posts)[0]];
                        Actions.deletePost(TestHelper.basicTeam.id, created)(store.dispatch, store.getState);
                    }
                }
            });

            const post = TestHelper.fakePost(TestHelper.basicChannel.id);
            Actions.createPost(
                TestHelper.basicTeam.id,
                post
            )(store.dispatch, store.getState);
        });
    });

    it('removePost', (done) => {
        TestHelper.initBasic(Client).then(async () => {
            const store = configureStore();
            const post1a = await Client.createPost(
                TestHelper.basicTeam.id,
                {...TestHelper.fakePost(TestHelper.basicChannel.id), root_id: TestHelper.basicPost.id}
            );

            await Actions.getPosts(
                TestHelper.basicTeam.id,
                TestHelper.basicChannel.id
            )(store.dispatch, store.getState);

            store.subscribe(() => {
                const postsInfo = store.getState().entities.posts.postsInfo;
                const postList = postsInfo[TestHelper.basicChannel.id];
                assert.strictEqual(postList.order.length, 0);
                assert.ifError(postList.posts[post1a.id]);
                assert.ifError(postList.posts[TestHelper.basicPost.id]);
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
            const post = await Client.createPost(
                TestHelper.basicTeam.id,
                TestHelper.fakePost(TestHelper.basicChannel.id)
            );

            store.subscribe(() => {
                const getRequest = store.getState().requests.posts.getPost;
                const postsInfo = store.getState().entities.posts.postsInfo;

                if (getRequest.status === RequestStatus.SUCCESS || getRequest.status === RequestStatus.FAILURE) {
                    if (getRequest.error) {
                        done(new Error(JSON.stringify(getRequest.error)));
                    } else {
                        assert.ok(postsInfo[TestHelper.basicChannel.id]);
                        assert.ok(postsInfo[TestHelper.basicChannel.id].order.length);
                        assert.ok(postsInfo[TestHelper.basicChannel.id].posts[post.id]);
                        done();
                    }
                }
            });

            Actions.getPost(
                TestHelper.basicTeam.id,
                TestHelper.basicChannel.id,
                post.id
            )(store.dispatch, store.getState);
        });
    });

    it('getPosts', (done) => {
        TestHelper.initBasic(Client).then(async () => {
            const store = configureStore();
            const post1 = await Client.createPost(
                TestHelper.basicTeam.id,
                TestHelper.fakePost(TestHelper.basicChannel.id)
            );
            const post1a = await Client.createPost(
                TestHelper.basicTeam.id,
                {...TestHelper.fakePost(TestHelper.basicChannel.id), root_id: post1.id}
            );
            const post2 = await Client.createPost(
                TestHelper.basicTeam.id,
                TestHelper.fakePost(TestHelper.basicChannel.id)
            );
            const post3 = await Client.createPost(
                TestHelper.basicTeam.id,
                TestHelper.fakePost(TestHelper.basicChannel.id)
            );
            const post3a = await Client.createPost(
                TestHelper.basicTeam.id,
                {...TestHelper.fakePost(TestHelper.basicChannel.id), root_id: post3.id}
            );

            store.subscribe(() => {
                const getRequest = store.getState().requests.posts.getPosts;
                const postsInfo = store.getState().entities.posts.postsInfo;

                if (getRequest.status === RequestStatus.SUCCESS || getRequest.status === RequestStatus.FAILURE) {
                    if (getRequest.error) {
                        done(new Error(JSON.stringify(getRequest.error)));
                    } else {
                        const postsList = postsInfo[TestHelper.basicChannel.id];
                        assert.ok(postsList);
                        assert.equal(postsList.order[0], post3a.id, 'wrong order');
                        assert.equal(postsList.order[1], post3.id, 'wrong order');
                        assert.equal(postsList.order[3], post1a.id, 'wrong order');
                        assert.ok(postsList.posts[post1.id], 'should exists');
                        assert.ok(postsList.posts[post2.id], 'should exists');
                        done();
                    }
                }
            });

            Actions.getPosts(
                TestHelper.basicTeam.id,
                TestHelper.basicChannel.id
            )(store.dispatch, store.getState);
        });
    }).timeout(3000);

    it('getPostsSince', (done) => {
        TestHelper.initBasic(Client).then(async () => {
            const store = configureStore();
            const post1 = await Client.createPost(
                TestHelper.basicTeam.id,
                TestHelper.fakePost(TestHelper.basicChannel.id)
            );
            await Client.createPost(
                TestHelper.basicTeam.id,
                {...TestHelper.fakePost(TestHelper.basicChannel.id), root_id: post1.id}
            );
            const post2 = await Client.createPost(
                TestHelper.basicTeam.id,
                TestHelper.fakePost(TestHelper.basicChannel.id)
            );
            const post3 = await Client.createPost(
                TestHelper.basicTeam.id,
                TestHelper.fakePost(TestHelper.basicChannel.id)
            );
            const post3a = await Client.createPost(
                TestHelper.basicTeam.id,
                {...TestHelper.fakePost(TestHelper.basicChannel.id), root_id: post3.id}
            );

            store.subscribe(() => {
                const getRequest = store.getState().requests.posts.getPostsSince;
                const postsInfo = store.getState().entities.posts.postsInfo;

                if (getRequest.status === RequestStatus.SUCCESS || getRequest.status === RequestStatus.FAILURE) {
                    if (getRequest.error) {
                        done(new Error(JSON.stringify(getRequest.error)));
                    } else {
                        const postsList = postsInfo[TestHelper.basicChannel.id];
                        assert.ok(postsList);
                        assert.equal(postsList.order[0], post3a.id, 'wrong order');
                        assert.equal(postsList.order[1], post3.id, 'wrong order');
                        assert.equal(Object.keys(postsList.posts).length, 2, 'wrong size');
                        done();
                    }
                }
            });

            Actions.getPostsSince(
                TestHelper.basicTeam.id,
                TestHelper.basicChannel.id,
                post2.create_at
            )(store.dispatch, store.getState);
        });
    }).timeout(3000);

    it('getPostsBefore', (done) => {
        TestHelper.initBasic(Client).then(async () => {
            const store = configureStore();
            const post1 = await Client.createPost(
                TestHelper.basicTeam.id,
                TestHelper.fakePost(TestHelper.basicChannel.id)
            );
            const post1a = await Client.createPost(
                TestHelper.basicTeam.id,
                {...TestHelper.fakePost(TestHelper.basicChannel.id), root_id: post1.id}
            );
            const post2 = await Client.createPost(
                TestHelper.basicTeam.id,
                TestHelper.fakePost(TestHelper.basicChannel.id)
            );
            const post3 = await Client.createPost(
                TestHelper.basicTeam.id,
                TestHelper.fakePost(TestHelper.basicChannel.id)
            );
            await Client.createPost(
                TestHelper.basicTeam.id,
                {...TestHelper.fakePost(TestHelper.basicChannel.id), root_id: post3.id}
            );

            store.subscribe(() => {
                const getRequest = store.getState().requests.posts.getPostsBefore;
                const postsInfo = store.getState().entities.posts.postsInfo;

                if (getRequest.status === RequestStatus.SUCCESS || getRequest.status === RequestStatus.FAILURE) {
                    if (getRequest.error) {
                        done(new Error(JSON.stringify(getRequest.error)));
                    } else {
                        const postsList = postsInfo[TestHelper.basicChannel.id];
                        assert.ok(postsList);
                        assert.equal(postsList.order[0], post1a.id, 'wrong order');
                        assert.equal(postsList.order[1], post1.id, 'wrong order');
                        assert.equal(Object.keys(postsList.posts).length, 3, 'wrong size');
                        done();
                    }
                }
            });

            Actions.getPostsBefore(
                TestHelper.basicTeam.id,
                TestHelper.basicChannel.id,
                post2.id,
                0,
                10
            )(store.dispatch, store.getState);
        });
    }).timeout(3000);

    it('getPostsAfter', (done) => {
        TestHelper.initBasic(Client).then(async () => {
            const store = configureStore();
            const post1 = await Client.createPost(
                TestHelper.basicTeam.id,
                TestHelper.fakePost(TestHelper.basicChannel.id)
            );
            await Client.createPost(
                TestHelper.basicTeam.id,
                {...TestHelper.fakePost(TestHelper.basicChannel.id), root_id: post1.id}
            );
            const post2 = await Client.createPost(
                TestHelper.basicTeam.id,
                TestHelper.fakePost(TestHelper.basicChannel.id)
            );
            const post3 = await Client.createPost(
                TestHelper.basicTeam.id,
                TestHelper.fakePost(TestHelper.basicChannel.id)
            );
            const post3a = await Client.createPost(
                TestHelper.basicTeam.id,
                {...TestHelper.fakePost(TestHelper.basicChannel.id), root_id: post3.id}
            );

            store.subscribe(() => {
                const getRequest = store.getState().requests.posts.getPostsAfter;
                const postsInfo = store.getState().entities.posts.postsInfo;

                if (getRequest.status === RequestStatus.SUCCESS || getRequest.status === RequestStatus.FAILURE) {
                    if (getRequest.error) {
                        done(new Error(JSON.stringify(getRequest.error)));
                    } else {
                        const postsList = postsInfo[TestHelper.basicChannel.id];
                        assert.ok(postsList);
                        assert.equal(postsList.order[0], post3a.id, 'wrong order');
                        assert.equal(postsList.order[1], post3.id, 'wrong order');
                        assert.equal(Object.keys(postsList.posts).length, 2, 'wrong size');
                        done();
                    }
                }
            });

            Actions.getPostsAfter(
                TestHelper.basicTeam.id,
                TestHelper.basicChannel.id,
                post2.id,
                0,
                10
            )(store.dispatch, store.getState);
        });
    }).timeout(3000);
});
