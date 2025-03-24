// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import TestHelper from '@test/test_helper';

import {getMentionProps, canSaveSettings, getUniqueKeywordsFromInput, type CanSaveSettings} from './mention_settings';

describe('getMentionProps', () => {
    test('Should have correct return type when input is empty', () => {
        const user = TestHelper.fakeUserModel({notifyProps: null});
        const mentionProps = getMentionProps(user);

        expect(mentionProps).toEqual({
            mentionKeywords: [
                `@${user.username}`,
            ],
            usernameMention: true,
            channel: true,
            first_name: true,
            comments: 'any',
            notifyProps: expect.any(Object),
        });
    });

    test('Should have correct return type for when channel, first_name, currentUser.username are provided', () => {
        const mentionProps = getMentionProps(TestHelper.fakeUserModel({
            username: 'testUser',
            notifyProps: TestHelper.fakeUserNotifyProps({
                comments: 'any',
                channel: 'true',
                first_name: 'true',
                mention_keys: 'testUser',
            }),
        }));

        expect(mentionProps.mentionKeywords).toEqual([]);
        expect(mentionProps.usernameMention).toEqual(true);
        expect(mentionProps.channel).toEqual(true);
        expect(mentionProps.first_name).toEqual(true);
    });

    test('Should have correct return type for mention_keys input', () => {
        const mentionProps = getMentionProps(TestHelper.fakeUserModel({
            username: 'testUser',
            notifyProps: TestHelper.fakeUserNotifyProps({
                mention_keys: 'testUser,testUser2,testKey1,testKey2',
            }),
        }));

        expect(mentionProps.mentionKeywords).toHaveLength(3);
        expect(mentionProps.mentionKeywords).toEqual(['testUser2', 'testKey1', 'testKey2']);
    });
});

describe('canSaveSettings', () => {
    const getBaseCanSaveSettingParams = (): CanSaveSettings => ({
        mentionKeywords: [],
        mentionProps: {
            mentionKeywords: [],
            usernameMention: true,
            channel: true,
            first_name: true,
            comments: 'any',
            notifyProps: TestHelper.fakeUserNotifyProps(),
        },
        channelMentionOn: true,
        replyNotificationType: 'any',
        firstNameMentionOn: true,
        usernameMentionOn: true,
    });

    test('Should return true when mentionKeywords have changed', () => {
        const canSaveSettingParams = getBaseCanSaveSettingParams();
        canSaveSettingParams.mentionKeywords = ['test1', 'test2'];
        canSaveSettingParams.mentionProps.mentionKeywords = ['test1', 'test2', 'test3'];

        expect(canSaveSettings(canSaveSettingParams)).toEqual(true);
    });

    test('Should return false when mentionKeywords have not changed', () => {
        const canSaveSettingParams = getBaseCanSaveSettingParams();
        canSaveSettingParams.mentionKeywords = ['test1', 'test2'];
        canSaveSettingParams.mentionProps.mentionKeywords = ['test2', 'test1'];

        expect(canSaveSettings(canSaveSettingParams)).toEqual(false);
    });

    test('Should return true when only userName has changed', () => {
        const canSaveSettingParams = getBaseCanSaveSettingParams();
        canSaveSettingParams.channelMentionOn = true;
        canSaveSettingParams.replyNotificationType = 'any';
        canSaveSettingParams.firstNameMentionOn = true;
        canSaveSettingParams.usernameMentionOn = true;
        canSaveSettingParams.mentionKeywords = ['test1', 'test2'];
        canSaveSettingParams.mentionProps.channel = true;
        canSaveSettingParams.mentionProps.comments = 'any';
        canSaveSettingParams.mentionProps.first_name = true;
        canSaveSettingParams.mentionProps.usernameMention = false;
        canSaveSettingParams.mentionProps.mentionKeywords = ['test1', 'test2'];
        canSaveSettingParams.mentionProps.notifyProps = TestHelper.fakeUserNotifyProps();

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
