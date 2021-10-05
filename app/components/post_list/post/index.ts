// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';
import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {from as from$, of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {Permissions, Preferences} from '@constants';
import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';
import {appsEnabled} from '@utils/apps';
import {hasJumboEmojiOnly} from '@utils/emoji/helpers';
import {areConsecutivePosts, isPostEphemeral} from '@utils/post';
import {canManageChannelMembers, hasPermissionForPost} from '@utils/role';

import Post from './post';

import type {WithDatabaseArgs} from '@typings/database/database';
import type CustomEmojiModel from '@typings/database/models/servers/custom_emoji';
import type PostModel from '@typings/database/models/servers/post';
import type PostsInThreadModel from '@typings/database/models/servers/posts_in_thread';
import type PreferenceModel from '@typings/database/models/servers/preference';
import type SystemModel from '@typings/database/models/servers/system';
import type UserModel from '@typings/database/models/servers/user';

const {SERVER: {CUSTOM_EMOJI, POST, PREFERENCE, SYSTEM, USER}} = MM_TABLES;

type PropsInput = WithDatabaseArgs & {
    featureFlagAppsEnabled?: string;
    currentUser: UserModel;
    nextPost: PostModel | undefined;
    post: PostModel;
    previousPost: PostModel | undefined;
}

async function shouldHighlightReplyBar(currentUser: UserModel, post: PostModel, postsInThread: PostsInThreadModel) {
    let commentsNotifyLevel = Preferences.COMMENTS_NEVER;
    let threadCreatedByCurrentUser = false;
    let rootPost: PostModel | undefined;
    const myPosts = await postsInThread.collections.get(POST).query(
        Q.and(
            Q.where('root_id', post.rootId || post.id),
            Q.where('create_at', Q.between(postsInThread.earliest, postsInThread.latest)),
            Q.where('user_id', currentUser.id),
        ),
    ).fetch();

    const threadRepliedToByCurrentUser = myPosts.length > 0;
    const root = await post.root.fetch();
    if (root.length) {
        rootPost = root[0];
    }

    if (rootPost?.userId === currentUser.id) {
        threadCreatedByCurrentUser = true;
    }
    if (currentUser.notifyProps?.comments) {
        commentsNotifyLevel = currentUser.notifyProps.comments;
    }

    const notCurrentUser = post.userId !== currentUser.id || Boolean(post.props?.from_webhook);
    if (notCurrentUser) {
        if (commentsNotifyLevel === Preferences.COMMENTS_ANY && (threadCreatedByCurrentUser || threadRepliedToByCurrentUser)) {
            return true;
        } else if (commentsNotifyLevel === Preferences.COMMENTS_ROOT && threadCreatedByCurrentUser) {
            return true;
        }
    }

    return false;
}
const withSystem = withObservables([], ({database}: WithDatabaseArgs) => ({
    featureFlagAppsEnabled: database.get(SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CONFIG).pipe(switchMap((cfg: SystemModel) => of$(cfg.value.FeatureFlagAppsEnabled))),
    currentUser: database.get(SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CURRENT_USER_ID).pipe(
        switchMap((currentUserId: SystemModel) => database.get(USER).findAndObserve(currentUserId.value)),
    ),
}));

const withPost = withObservables(
    ['currentUser', 'post', 'previousPost', 'nextPost'],
    ({featureFlagAppsEnabled, currentUser, database, post, previousPost, nextPost}: PropsInput) => {
        let isFirstReply = of$(true);
        let isJumboEmoji = of$(false);
        let isLastReply = of$(true);
        let isPostAddChannelMember = of$(false);
        const isOwner = currentUser.id === post.userId;
        const canDelete = from$(hasPermissionForPost(post, currentUser, isOwner ? Permissions.DELETE_POST : Permissions.DELETE_OTHERS_POSTS, false));
        const isConsecutivePost = post.author.observe().pipe(switchMap(
            (user: UserModel) => {
                return of$(Boolean(post && previousPost && !user.isBot && post.rootId && areConsecutivePosts(post, previousPost)));
            },
        ));
        const isEphemeral = of$(isPostEphemeral(post));
        const isFlagged = database.get(PREFERENCE).query(
            Q.where('category', Preferences.CATEGORY_FLAGGED_POST),
            Q.where('name', post.id),
        ).observe().pipe(switchMap((pref: PreferenceModel[]) => of$(Boolean(pref.length))));

        if (post.props?.add_channel_member && isPostEphemeral(post)) {
            isPostAddChannelMember = from$(canManageChannelMembers(post, currentUser));
        }

        const highlightReplyBar = post.postsInThread.observe().pipe(
            switchMap((postsInThreads: PostsInThreadModel[]) => {
                if (postsInThreads.length) {
                    return from$(shouldHighlightReplyBar(currentUser, post, postsInThreads[0]));
                }
                return of$(false);
            }));

        let differentThreadSequence = true;
        if (post.rootId) {
            differentThreadSequence = previousPost?.rootId ? previousPost?.rootId !== post.rootId : previousPost?.id !== post.rootId;
            isFirstReply = of$(differentThreadSequence || (previousPost?.id === post.rootId || previousPost?.rootId === post.rootId));
            isLastReply = of$(!(nextPost?.rootId === post.rootId));
        }

        if (post.message.length && !(/^\s{4}/).test(post.message)) {
            isJumboEmoji = post.collections.get(CUSTOM_EMOJI).query().observe().pipe(
                // eslint-disable-next-line max-nested-callbacks
                switchMap((customEmojis: CustomEmojiModel[]) => of$(hasJumboEmojiOnly(post.message, customEmojis.map((c) => c.name))),
                ));
        }

        const partialConfig: Partial<ClientConfig> = {
            FeatureFlagAppsEnabled: featureFlagAppsEnabled,
        };

        return {
            appsEnabled: of$(appsEnabled(partialConfig)),
            canDelete,
            currentUser,
            differentThreadSequence: of$(differentThreadSequence),
            files: post.files.observe(),
            highlightReplyBar,
            isConsecutivePost,
            isEphemeral,
            isFirstReply,
            isFlagged,
            isJumboEmoji,
            isLastReply,
            isPostAddChannelMember,
            post: post.observe(),
            reactionsCount: post.reactions.observeCount(),
        };
    });

export default withDatabase(withSystem(withPost(Post)));
