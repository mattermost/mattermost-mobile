// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {General} from '@constants';

import {hasExplicitMessageMention, shouldDeliverDirectNotification, type DirectNotificationFilterInput} from './filter';

const post = (overrides: Partial<Post> = {}): Post => ({
    id: 'post-id',
    channel_id: 'channel-id',
    user_id: 'author-id',
    message: 'hello',
    root_id: '',
    type: '',
    props: {},
    ...overrides,
} as Post);

const input = (overrides: Partial<DirectNotificationFilterInput> = {}): DirectNotificationFilterInput => ({
    post: post(),
    currentUserId: 'current-user',
    userNotifyProps: {push: 'mention', push_status: 'online', push_threads: 'all'},
    channelNotifyProps: {},
    channelType: General.OPEN_CHANNEL,
    isCRTEnabled: false,
    mentions: [],
    status: General.ONLINE,
    ...overrides,
});

describe('Direct notification filtering', () => {
    it('does not notify for the signed-in user\'s own ordinary post', () => {
        expect(shouldDeliverDirectNotification(input({
            post: post({user_id: 'current-user'}),
            userNotifyProps: {push: 'all'},
        }))).toBe(false);
    });

    it('allows an own webhook post when all activity is enabled', () => {
        expect(shouldDeliverDirectNotification(input({
            post: post({user_id: 'current-user', props: {from_webhook: 'true'}}),
            userNotifyProps: {push: 'all'},
        }))).toBe(true);
    });

    it('excludes system and silent posts but honors force notification', () => {
        expect(shouldDeliverDirectNotification(input({post: post({type: 'system_join_channel'})}))).toBe(false);
        expect(shouldDeliverDirectNotification(input({post: post({props: {silent_notification: true}})}))).toBe(false);
        expect(shouldDeliverDirectNotification(input({
            post: post({type: 'system_join_channel', props: {force_notification: 'true'}}),
            status: General.DND,
        }))).toBe(true);
    });

    it('honors channel mute and none preferences', () => {
        expect(shouldDeliverDirectNotification(input({
            channelNotifyProps: {mark_unread: 'mention'},
            userNotifyProps: {push: 'all'},
        }))).toBe(false);
        expect(shouldDeliverDirectNotification(input({
            channelNotifyProps: {push: 'none'},
            mentions: ['current-user'],
        }))).toBe(false);
    });

    it('requires a mention at mention level and allows all activity at all level', () => {
        expect(shouldDeliverDirectNotification(input())).toBe(false);
        expect(shouldDeliverDirectNotification(input({mentions: ['current-user']}))).toBe(true);
        expect(shouldDeliverDirectNotification(input({userNotifyProps: {push: 'all'}}))).toBe(true);
    });

    it('promotes only the default GM mention preference to all activity', () => {
        expect(shouldDeliverDirectNotification(input({channelType: General.GM_CHANNEL}))).toBe(true);
        expect(shouldDeliverDirectNotification(input({
            channelType: General.GM_CHANNEL,
            channelNotifyProps: {push: 'mention'},
            mentions: ['current-user'],
        }))).toBe(true);
        expect(shouldDeliverDirectNotification(input({
            channelType: General.GM_CHANNEL,
            channelNotifyProps: {push: 'mention'},
            mentions: [],
        }))).toBe(false);
    });

    it('does not confuse a GM membership mention with message-level evidence', () => {
        const gmPost = post({message: 'a routine GM update'});
        expect(hasExplicitMessageMention(gmPost, [{key: '@current'}], 'current')).toBe(false);
        expect(hasExplicitMessageMention(post({message: 'hello @current'}), [{key: '@current'}], 'current')).toBe(true);
        expect(hasExplicitMessageMention(post({message: 'hello @current2'}), [{key: '@current'}], 'current')).toBe(false);
        expect(hasExplicitMessageMention(post({message: 'keyword alert'}), [{key: 'keyword'}], 'current')).toBe(true);
    });

    it('honors DND/OOO and away/offline push status preferences', () => {
        expect(shouldDeliverDirectNotification(input({status: General.DND, mentions: ['current-user']}))).toBe(false);
        expect(shouldDeliverDirectNotification(input({status: General.OUT_OF_OFFICE, mentions: ['current-user']}))).toBe(false);
        expect(shouldDeliverDirectNotification(input({
            userNotifyProps: {push: 'all', push_status: 'away'},
            status: General.AWAY,
        }))).toBe(true);
        expect(shouldDeliverDirectNotification(input({
            userNotifyProps: {push: 'all', push_status: 'away'},
            status: General.ONLINE,
        }))).toBe(false);
        expect(shouldDeliverDirectNotification(input({
            userNotifyProps: {push: 'all', push_status: 'offline'},
            status: General.OFFLINE,
        }))).toBe(true);
        expect(shouldDeliverDirectNotification(input({
            userNotifyProps: {push: 'all', push_status: 'offline'},
            status: General.AWAY,
        }))).toBe(false);
    });

    it('requires a follower or mention for CRT replies, even with all-activity push', () => {
        expect(shouldDeliverDirectNotification(input({
            post: post({root_id: 'root-id'}),
            isCRTEnabled: true,
            userNotifyProps: {push: 'all'},
        }))).toBe(false);
        expect(shouldDeliverDirectNotification(input({
            post: post({root_id: 'root-id'}),
            isCRTEnabled: true,
            isFollowingThread: true,
            userNotifyProps: {push: 'mention', push_threads: 'all'},
        }))).toBe(true);
        expect(shouldDeliverDirectNotification(input({
            post: post({root_id: 'root-id'}),
            isCRTEnabled: true,
            isFollowingThread: true,
            userNotifyProps: {push: 'mention', push_threads: 'mention'},
        }))).toBe(false);
        expect(shouldDeliverDirectNotification(input({
            post: post({root_id: 'root-id'}),
            isCRTEnabled: true,
            mentions: ['current-user'],
            userNotifyProps: {push: 'mention', push_threads: 'mention'},
        }))).toBe(true);
    });

    it('applies channel CRT thread preferences without allowing none', () => {
        expect(shouldDeliverDirectNotification(input({
            post: post({root_id: 'root-id'}),
            isCRTEnabled: true,
            isFollowingThread: true,
            channelNotifyProps: {push: 'mention', push_threads: 'all'},
        }))).toBe(true);
        expect(shouldDeliverDirectNotification(input({
            post: post({root_id: 'root-id'}),
            isCRTEnabled: true,
            isFollowingThread: true,
            channelNotifyProps: {push: 'all', push_threads: 'mention'},
        }))).toBe(true);
        expect(shouldDeliverDirectNotification(input({
            post: post({root_id: 'root-id'}),
            isCRTEnabled: true,
            isFollowingThread: true,
            channelNotifyProps: {push: 'none', push_threads: 'all'},
        }))).toBe(false);
    });
});
