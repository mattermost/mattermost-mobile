// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {getMentionProps, canSaveSettings, getUniqueKeywordsFromInput, type CanSaveSettings} from './mention_settings';

import type UserModel from '@typings/database/models/servers/user';

describe('getMentionProps', () => {
    test('Should have correct return type when input is empty', () => {
        const mentionProps = getMentionProps({notifyProps: {} as UserNotifyProps} as UserModel);

        expect(mentionProps).toEqual({
            mentionKeywords: [],
            usernameMention: false,
            channel: false,
            first_name: false,
            comments: '',
            notifyProps: {},
        });
    });

    test('Should have correct return type for when channel, first_name, currentUser.username are provided', () => {
        const mentionProps = getMentionProps({
            username: 'testUser',
            notifyProps: {
                comments: 'any',
                channel: 'true',
                first_name: 'true',
                mention_keys: 'testUser',
            } as UserNotifyProps,
        } as UserModel);

        expect(mentionProps.mentionKeywords).toEqual([]);
        expect(mentionProps.usernameMention).toEqual(true);
        expect(mentionProps.channel).toEqual(true);
        expect(mentionProps.first_name).toEqual(true);
    });

    test('Should have correct return type for mention_keys input', () => {
        const mentionProps = getMentionProps({
            username: 'testUser',
            notifyProps: {
                mention_keys: 'testUser,testUser2,testKey1,testKey2',
            } as UserNotifyProps,
        } as UserModel);

        expect(mentionProps.mentionKeywords).toHaveLength(3);
        expect(mentionProps.mentionKeywords).toEqual(['testUser2', 'testKey1', 'testKey2']);
    });
});

describe('canSaveSettings', () => {
    test('Should return true when mentionKeywords have changed', () => {
        const canSaveSettingParams = {
            mentionKeywords: ['test1', 'test2'],
            mentionProps: {
                mentionKeywords: ['test1', 'test2', 'test3'],
            },
        } as CanSaveSettings;

        expect(canSaveSettings(canSaveSettingParams)).toEqual(true);
    });

    test('Should return false when mentionKeywords have not changed', () => {
        const canSaveSettingParams = {
            mentionKeywords: ['test1', 'test2'],
            mentionProps: {
                mentionKeywords: ['test2', 'test1'],
            },
        } as CanSaveSettings;

        expect(canSaveSettings(canSaveSettingParams)).toEqual(false);
    });

    test('Should return true when only userName has changed', () => {
        const canSaveSettingParams = {
            channelMentionOn: true,
            replyNotificationType: 'any',
            firstNameMentionOn: true,
            usernameMentionOn: true,
            mentionKeywords: ['test1', 'test2'],
            mentionProps: {
                channel: true,
                comments: 'any' as UserNotifyProps['comments'],
                first_name: true,
                usernameMention: false,
                mentionKeywords: ['test1', 'test2'],
                notifyProps: {} as UserNotifyProps,
            },
        };

        expect(canSaveSettings(canSaveSettingParams)).toEqual(true);
    });
});

describe('getUniqueKeywordsFromInput', () => {
    test('Should return empty if input is empty and keywords are empty', () => {
        expect(getUniqueKeywordsFromInput('', [])).toEqual([]);
    });

    test('Should return same keywords if input is empty', () => {
        expect(getUniqueKeywordsFromInput('', ['test1', 'test2'])).toEqual(['test1', 'test2']);
    });

    test('Should return same input if keywords are empty', () => {
        expect(getUniqueKeywordsFromInput('test1', [])).toEqual(['test1']);
    });

    test('Should filter out commas from input', () => {
        expect(getUniqueKeywordsFromInput('tes,,t1,', [])).toEqual(['test1']);
        expect(getUniqueKeywordsFromInput(',,    ,', ['test1'])).toEqual(['test1']);
    });

    test('Should filter out spaces from input', () => {
        expect(getUniqueKeywordsFromInput('t     es t      1', [])).toEqual(['test1']);
    });

    test('Should filter out duplicate keywords from input', () => {
        expect(getUniqueKeywordsFromInput('te,s   t1', ['test1', 'test2'])).toEqual(['test1', 'test2']);
    });
});
