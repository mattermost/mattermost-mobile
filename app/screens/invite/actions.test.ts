// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable max-lines */

import {createIntl} from 'react-intl';

import {addMembersToChannel} from '@actions/remote/channel';
import {addUsersToTeam, getTeamMembersByIds, sendEmailInvitesToTeam, sendGuestEmailInvitesToTeam} from '@actions/remote/team';
import {ServerErrors} from '@constants';
import {DEFAULT_LOCALE, getTranslations} from '@i18n';
import TestHelper from '@test/test_helper';

import {sendGuestInvites, sendMembersInvites} from './actions';

jest.mock('@actions/remote/channel');
jest.mock('@actions/remote/team');

const mockAddMembersToChannel = jest.mocked(addMembersToChannel);
const mockAddUsersToTeam = jest.mocked(addUsersToTeam);
const mockGetTeamMembersByIds = jest.mocked(getTeamMembersByIds);
const mockSendEmailInvitesToTeam = jest.mocked(sendEmailInvitesToTeam);
const mockSendGuestEmailInvitesToTeam = jest.mocked(sendGuestEmailInvitesToTeam);

const translations = getTranslations(DEFAULT_LOCALE);
const intl = createIntl({locale: DEFAULT_LOCALE, messages: translations});

describe('actions', () => {
    const serverUrl = 'https://test.server.com';
    const teamId = 'team-1';
    const teamDisplayName = 'Test Team';
    const formatMessage = intl.formatMessage;

    describe('sendMembersInvites', () => {
        it('should successfully invite users to team', async () => {
            const userId1 = 'user-1';
            const userId2 = 'user-2';
            const user1 = TestHelper.fakeUser({id: userId1, roles: 'system_user'});
            const user2 = TestHelper.fakeUser({id: userId2, roles: 'system_user'});
            const selectedIds = {
                [userId1]: user1,
                [userId2]: user2,
            };

            mockGetTeamMembersByIds.mockResolvedValue({
                members: [],
                error: undefined,
            });

            mockAddUsersToTeam.mockResolvedValue({
                members: [
                    {member: TestHelper.fakeTeamMember(userId1, 'team-1'), user_id: userId1, error: undefined},
                    {member: TestHelper.fakeTeamMember(userId2, 'team-1'), user_id: userId2, error: undefined},
                ],
                error: undefined,
            });

            const result = await sendMembersInvites(
                serverUrl,
                teamId,
                selectedIds,
                false,
                teamDisplayName,
                formatMessage,
            );

            expect(result.error).toBe(false);
            expect(result.sent).toHaveLength(2);
            expect(result.notSent).toHaveLength(0);
            expect(result.sent[0].userId).toBe(userId1);
            expect(result.sent[1].userId).toBe(userId2);
            expect(mockGetTeamMembersByIds).toHaveBeenCalledWith(serverUrl, teamId, [userId1, userId2]);
            expect(mockAddUsersToTeam).toHaveBeenCalledWith(serverUrl, teamId, [userId1, userId2]);
        });

        it('should successfully invite users via email', async () => {
            const email1 = 'user1@example.com';
            const email2 = 'user2@example.com';
            const selectedIds = {
                [email1]: email1,
                [email2]: email2,
            };

            mockSendEmailInvitesToTeam.mockResolvedValue({
                members: [
                    {email: email1, error: undefined},
                    {email: email2, error: undefined},
                ],
                error: undefined,
            });

            const result = await sendMembersInvites(
                serverUrl,
                teamId,
                selectedIds,
                false,
                teamDisplayName,
                formatMessage,
            );

            expect(result.error).toBe(false);
            expect(result.sent).toHaveLength(2);
            expect(result.notSent).toHaveLength(0);
            expect(result.sent[0].userId).toBe(email1);
            expect(result.sent[1].userId).toBe(email2);
            expect(mockSendEmailInvitesToTeam).toHaveBeenCalledWith(serverUrl, teamId, [email1, email2]);
        });

        it('should handle mixed users and emails', async () => {
            const userId = 'user-1';
            const email = 'user@example.com';
            const user = TestHelper.fakeUser({id: userId, roles: 'system_user'});
            const selectedIds = {
                [userId]: user,
                [email]: email,
            };

            mockGetTeamMembersByIds.mockResolvedValue({
                members: [],
                error: undefined,
            });

            mockAddUsersToTeam.mockResolvedValue({
                members: [{member: {...TestHelper.fakeTeamMember(userId, 'team-1')}, user_id: userId, error: undefined}],
                error: undefined,
            });

            mockSendEmailInvitesToTeam.mockResolvedValue({
                members: [{email, error: undefined}],
                error: undefined,
            });

            const result = await sendMembersInvites(
                serverUrl,
                teamId,
                selectedIds,
                false,
                teamDisplayName,
                formatMessage,
            );

            expect(result.error).toBe(false);
            expect(result.sent).toHaveLength(2);
            expect(result.notSent).toHaveLength(0);
        });

        it('should not invite guest users', async () => {
            const userId = 'user-1';
            const user = {id: userId, roles: 'system_guest'} as UserProfile;
            const selectedIds = {[userId]: user};

            mockGetTeamMembersByIds.mockResolvedValue({
                members: [],
                error: undefined,
            });

            const result = await sendMembersInvites(
                serverUrl,
                teamId,
                selectedIds,
                false,
                teamDisplayName,
                formatMessage,
            );

            expect(result.error).toBe(false);
            expect(result.sent).toHaveLength(0);
            expect(result.notSent).toHaveLength(1);
            expect(result.notSent[0].userId).toBe(userId);
            expect(result.notSent[0].reason).toBe('Contact your admin to make this guest a full member');
            expect(mockAddUsersToTeam).not.toHaveBeenCalled();
        });

        it('should not invite users who are already team members', async () => {
            const userId = 'user-1';
            const user = {id: userId, roles: 'system_user'} as UserProfile;
            const selectedIds = {[userId]: user};

            mockGetTeamMembersByIds.mockResolvedValue({
                members: [TestHelper.fakeTeamMember(userId, 'team-1')],
                error: undefined,
            });

            const result = await sendMembersInvites(
                serverUrl,
                teamId,
                selectedIds,
                false,
                teamDisplayName,
                formatMessage,
            );

            expect(result.error).toBe(false);
            expect(result.sent).toHaveLength(0);
            expect(result.notSent).toHaveLength(1);
            expect(result.notSent[0].userId).toBe(userId);
            expect(mockAddUsersToTeam).not.toHaveBeenCalled();
        });

        it('should handle errors from getTeamMembersByIds', async () => {
            const userId = 'user-1';
            const user = {id: userId, roles: 'system_user'} as UserProfile;
            const selectedIds = {[userId]: user};

            mockGetTeamMembersByIds.mockResolvedValue({
                members: [],
                error: {message: 'Database error'} as any,
            });

            const result = await sendMembersInvites(
                serverUrl,
                teamId,
                selectedIds,
                false,
                teamDisplayName,
                formatMessage,
            );

            expect(result.error).toBe(true);
            expect(result.sent).toHaveLength(0);
            expect(result.notSent).toHaveLength(0);
        });

        it('should handle errors from addUsersToTeam', async () => {
            const userId = 'user-1';
            const user = {id: userId, roles: 'system_user'} as UserProfile;
            const selectedIds = {[userId]: user};

            mockGetTeamMembersByIds.mockResolvedValue({
                members: [],
                error: undefined,
            });

            mockAddUsersToTeam.mockResolvedValue({
                members: [],
                error: {message: 'Failed to add users'} as any,
            });

            const result = await sendMembersInvites(
                serverUrl,
                teamId,
                selectedIds,
                false,
                teamDisplayName,
                formatMessage,
            );

            expect(result.error).toBe(true);
            expect(result.sent).toHaveLength(0);
            expect(result.notSent).toHaveLength(0);
        });

        it('should handle individual user errors from addUsersToTeam', async () => {
            const userId1 = 'user-1';
            const userId2 = 'user-2';
            const user1 = {id: userId1, roles: 'system_user'} as UserProfile;
            const user2 = {id: userId2, roles: 'system_user'} as UserProfile;
            const selectedIds = {
                [userId1]: user1,
                [userId2]: user2,
            };

            mockGetTeamMembersByIds.mockResolvedValue({
                members: [],
                error: undefined,
            });

            mockAddUsersToTeam.mockResolvedValue({
                members: [
                    {member: TestHelper.fakeTeamMember(userId1, 'team-1'), user_id: userId1, error: {message: 'User not found'} as any},
                    {member: TestHelper.fakeTeamMember(userId2, 'team-1'), user_id: userId2, error: undefined},
                ],
                error: undefined,
            });

            const result = await sendMembersInvites(
                serverUrl,
                teamId,
                selectedIds,
                false,
                teamDisplayName,
                formatMessage,
            );

            expect(result.error).toBe(false);
            expect(result.sent).toHaveLength(1);
            expect(result.notSent).toHaveLength(1);
            expect(result.notSent[0].userId).toBe(userId1);
            expect(result.notSent[0].reason).toBe('User not found');
            expect(result.sent[0].userId).toBe(userId2);
        });

        it('should handle errors from sendEmailInvitesToTeam', async () => {
            const email = 'user@example.com';
            const selectedIds = {[email]: email};

            mockSendEmailInvitesToTeam.mockResolvedValue({
                members: [],
                error: {message: 'SMTP error'} as any,
            });

            const result = await sendMembersInvites(
                serverUrl,
                teamId,
                selectedIds,
                false,
                teamDisplayName,
                formatMessage,
            );

            expect(result.error).toBe(true);
            expect(result.sent).toHaveLength(0);
            expect(result.notSent).toHaveLength(0);
        });

        it('should handle individual email errors', async () => {
            const email1 = 'user1@example.com';
            const email2 = 'user2@example.com';
            const selectedIds = {
                [email1]: email1,
                [email2]: email2,
            };

            mockSendEmailInvitesToTeam.mockResolvedValue({
                members: [
                    {email: email1, error: {message: 'Invalid email'} as any},
                    {email: email2, error: undefined},
                ],
                error: undefined,
            });

            const result = await sendMembersInvites(
                serverUrl,
                teamId,
                selectedIds,
                false,
                teamDisplayName,
                formatMessage,
            );

            expect(result.error).toBe(false);
            expect(result.sent).toHaveLength(1);
            expect(result.notSent).toHaveLength(1);
            expect(result.notSent[0].userId).toBe(email1);
            expect(result.notSent[0].reason).toBe('Invalid email');
            expect(result.sent[0].userId).toBe(email2);
        });

        it('should show SMTP configuration error for admin when email fails with SEND_EMAIL_WITH_DEFAULTS_ERROR', async () => {
            const email = 'user@example.com';
            const selectedIds = {[email]: email};

            mockSendEmailInvitesToTeam.mockResolvedValue({
                members: [
                    {
                        email,
                        error: {
                            message: 'SMTP error',
                            server_error_id: ServerErrors.SEND_EMAIL_WITH_DEFAULTS_ERROR,
                        } as any,
                    },
                ],
                error: undefined,
            });

            const result = await sendMembersInvites(
                serverUrl,
                teamId,
                selectedIds,
                true, // isAdmin
                teamDisplayName,
                formatMessage,
            );

            expect(result.error).toBe(false);
            expect(result.notSent).toHaveLength(1);
            expect(result.notSent[0].reason).toContain('SMTP is not configured');
            expect(result.notSent[0].reason).toBe('SMTP is not configured in System Console');
        });

        it('should show regular error message for non-admin when email fails with SEND_EMAIL_WITH_DEFAULTS_ERROR', async () => {
            const email = 'user@example.com';
            const selectedIds = {[email]: email};

            mockSendEmailInvitesToTeam.mockResolvedValue({
                members: [
                    {
                        email,
                        error: {
                            message: 'SMTP error',
                            server_error_id: ServerErrors.SEND_EMAIL_WITH_DEFAULTS_ERROR,
                        } as any,
                    },
                ],
                error: undefined,
            });

            const result = await sendMembersInvites(
                serverUrl,
                teamId,
                selectedIds,
                false, // not admin
                teamDisplayName,
                formatMessage,
            );

            expect(result.error).toBe(false);
            expect(result.notSent).toHaveLength(1);
            expect(result.notSent[0].reason).toBe('SMTP error');
        });
    });

    describe('sendGuestInvites', () => {
        const options = {
            inviteAsGuest: true,
            includeCustomMessage: false,
            customMessage: '',
            selectedChannels: ['channel-1', 'channel-2'],
        };

        it('should successfully invite guest users', async () => {
            const userId = 'user-1';
            const user = {id: userId, roles: 'system_guest'} as UserProfile;
            const selectedIds = {[userId]: user};

            mockAddUsersToTeam.mockResolvedValue({
                members: [{member: TestHelper.fakeTeamMember(userId, 'team-1'), user_id: userId, error: undefined}],
                error: undefined,
            });

            mockAddMembersToChannel.mockResolvedValue({
                channelMemberships: [TestHelper.fakeChannelMember({user_id: userId, channel_id: 'channel-1'})],
                error: undefined,
            });

            const result = await sendGuestInvites(
                serverUrl,
                teamId,
                selectedIds,
                options,
                formatMessage,
            );

            expect(result.sent).toHaveLength(1);
            expect(result.notSent).toHaveLength(0);
            expect(result.sent[0].userId).toBe(userId);
        });

        it('should successfully invite guests via email', async () => {
            const email = 'guest@example.com';
            const selectedIds = {[email]: email};

            mockSendGuestEmailInvitesToTeam.mockResolvedValue({
                members: [{email, error: undefined}],
                error: undefined,
            });

            const result = await sendGuestInvites(
                serverUrl,
                teamId,
                selectedIds,
                options,
                formatMessage,
            );

            expect(result.sent).toHaveLength(1);
            expect(result.notSent).toHaveLength(0);
            expect(result.sent[0].email).toBe(email);
        });

        it('should handle mixed users and emails for guest invites', async () => {
            const userId = 'user-1';
            const email = 'guest@example.com';
            const user = {id: userId, roles: 'system_guest'} as UserProfile;
            const selectedIds = {
                [userId]: user,
                [email]: email,
            };

            mockAddUsersToTeam.mockResolvedValue({
                members: [{member: TestHelper.fakeTeamMember(userId, 'team-1'), user_id: userId, error: undefined}],
                error: undefined,
            });

            mockAddMembersToChannel.mockResolvedValue({
                channelMemberships: [TestHelper.fakeChannelMember({user_id: userId, channel_id: 'channel-1'})],
                error: undefined,
            });

            mockSendGuestEmailInvitesToTeam.mockResolvedValue({
                members: [{email, error: undefined}],
                error: undefined,
            });

            const result = await sendGuestInvites(
                serverUrl,
                teamId,
                selectedIds,
                options,
                formatMessage,
            );

            expect(result.sent).toHaveLength(2);
            expect(result.notSent).toHaveLength(0);
        });

        it('should not invite non-guest users as guests', async () => {
            const userId = 'user-1';
            const user = TestHelper.fakeUser({id: userId, roles: 'system_user'});
            const selectedIds = {[userId]: user};

            const result = await sendGuestInvites(
                serverUrl,
                teamId,
                selectedIds,
                options,
                formatMessage,
            );

            expect(result.sent).toHaveLength(0);
            expect(result.notSent).toHaveLength(1);
            expect(result.notSent[0].userId).toBe(userId);
            expect(result.notSent[0].reason).toBe('This person is already a member of the workspace. Invite them as a member instead of a guest.');
        });

        it('should handle errors from addUsersToTeam for guest invites', async () => {
            const userId = 'user-1';
            const user = TestHelper.fakeUser({id: userId, roles: 'system_guest'});
            const selectedIds = {[userId]: user};

            mockAddUsersToTeam.mockResolvedValue({
                members: [],
                error: {message: 'Failed to add user'} as any,
            });

            const result = await sendGuestInvites(
                serverUrl,
                teamId,
                selectedIds,
                options,
                formatMessage,
            );

            expect(result.sent).toHaveLength(0);
            expect(result.notSent).toHaveLength(1);
            expect(result.notSent[0].userId).toBe(userId);
            expect(result.notSent[0].reason).toBe('Failed to add user');
        });

        it('should handle errors when adding guest to channels', async () => {
            const userId = 'user-1';
            const user = {id: userId, roles: 'system_guest'} as UserProfile;
            const selectedIds = {[userId]: user};

            mockAddUsersToTeam.mockResolvedValue({
                members: [{member: TestHelper.fakeTeamMember(userId, 'team-1'), user_id: userId, error: undefined}],
                error: undefined,
            });

            mockAddMembersToChannel.mockResolvedValue({
                channelMemberships: [],
                error: undefined,
            });

            const result = await sendGuestInvites(
                serverUrl,
                teamId,
                selectedIds,
                options,
                formatMessage,
            );

            expect(result.sent).toHaveLength(0);
            expect(result.notSent).toHaveLength(1);
            expect(result.notSent[0].userId).toBe(userId);
            expect(result.notSent[0].reason).toBe('Unable to add user to 2 channels');
        });

        it('should handle errors from addMembersToChannel', async () => {
            const userId = 'user-1';
            const user = {id: userId, roles: 'system_guest'} as UserProfile;
            const selectedIds = {[userId]: user};

            mockAddUsersToTeam.mockResolvedValue({
                members: [{member: TestHelper.fakeTeamMember(userId, 'team-1'), user_id: userId, error: undefined}],
                error: undefined,
            });

            mockAddMembersToChannel.mockResolvedValue({
                channelMemberships: [],
                error: {message: 'Channel error'} as any,
            });

            const result = await sendGuestInvites(
                serverUrl,
                teamId,
                selectedIds,
                options,
                formatMessage,
            );

            expect(result.sent).toHaveLength(0);
            expect(result.notSent.length).toBe(1);
            expect(result.notSent[0].userId).toBe(userId);
            expect(result.notSent[0].reason).toBe('Unable to add user to 2 channels');
        });

        it('should handle partial channel failures (some channels succeed, some fail)', async () => {
            const userId = 'user-1';
            const user = {id: userId, roles: 'system_guest'} as UserProfile;
            const selectedIds = {[userId]: user};

            mockAddUsersToTeam.mockResolvedValue({
                members: [{member: TestHelper.fakeTeamMember(userId, 'team-1'), user_id: userId, error: undefined}],
                error: undefined,
            });

            // First channel succeeds, second fails with empty memberships
            mockAddMembersToChannel.
                mockResolvedValueOnce({
                    channelMemberships: [TestHelper.fakeChannelMember({user_id: userId, channel_id: 'channel-1'})],
                    error: undefined,
                }).
                mockResolvedValueOnce({
                    channelMemberships: [],
                    error: undefined,
                });

            const result = await sendGuestInvites(
                serverUrl,
                teamId,
                selectedIds,
                options,
                formatMessage,
            );

            expect(result.sent).toHaveLength(0);
            expect(result.notSent).toHaveLength(1);
            expect(result.notSent[0].userId).toBe(userId);
            expect(result.notSent[0].reason).toBe('Unable to add user to 1 channel');
        });

        it('should successfully add guest to multiple channels', async () => {
            const userId = 'user-1';
            const user = {id: userId, roles: 'system_guest'} as UserProfile;
            const selectedIds = {[userId]: user};

            mockAddUsersToTeam.mockResolvedValue({
                members: [{member: TestHelper.fakeTeamMember(userId, 'team-1'), user_id: userId, error: undefined}],
                error: undefined,
            });

            mockAddMembersToChannel.
                mockResolvedValueOnce({
                    channelMemberships: [TestHelper.fakeChannelMember({user_id: userId, channel_id: 'channel-1'})],
                    error: undefined,
                }).
                mockResolvedValueOnce({
                    channelMemberships: [TestHelper.fakeChannelMember({user_id: userId, channel_id: 'channel-2'})],
                    error: undefined,
                });

            const result = await sendGuestInvites(
                serverUrl,
                teamId,
                selectedIds,
                options,
                formatMessage,
            );

            expect(result.sent).toHaveLength(1);
            expect(result.notSent).toHaveLength(0);
            expect(result.sent[0].userId).toBe(userId);
            expect(result.sent[0].reason).toBe('This guest has been added to the team and 2 channels.');
        });

        it('should handle errors from sendGuestEmailInvitesToTeam', async () => {
            const email = 'guest@example.com';
            const selectedIds = {[email]: email};

            mockSendGuestEmailInvitesToTeam.mockResolvedValue({
                members: [],
                error: {message: 'Email error'} as any,
            });

            const result = await sendGuestInvites(
                serverUrl,
                teamId,
                selectedIds,
                options,
                formatMessage,
            );

            expect(result.sent).toHaveLength(0);
            expect(result.notSent).toHaveLength(1);
            expect(result.notSent[0].userId).toBe(email);
            expect(result.notSent[0].reason).toBe('Email error');
        });

        it('should handle individual email errors from sendGuestEmailInvitesToTeam', async () => {
            const email1 = 'guest1@example.com';
            const email2 = 'guest2@example.com';
            const selectedIds = {
                [email1]: email1,
                [email2]: email2,
            };

            mockSendGuestEmailInvitesToTeam.mockResolvedValue({
                members: [
                    {email: email1, error: {message: 'Invalid email'} as any},
                    {email: email2, error: undefined},
                ],
                error: undefined,
            });

            const result = await sendGuestInvites(
                serverUrl,
                teamId,
                selectedIds,
                options,
                formatMessage,
            );

            expect(result.sent).toHaveLength(1);
            expect(result.notSent).toHaveLength(1);
            expect(result.notSent[0].email).toBe(email1);
            expect(result.notSent[0].reason).toBe('Invalid email');
            expect(result.sent[0].email).toBe(email2);
        });

        it('should include custom message when sending guest email invites', async () => {
            const email = 'guest@example.com';
            const selectedIds = {[email]: email};
            const customOptions = {
                ...options,
                includeCustomMessage: true,
                customMessage: 'Welcome to the team!',
            };

            mockSendGuestEmailInvitesToTeam.mockResolvedValue({
                members: [{email, error: undefined}],
                error: undefined,
            });

            await sendGuestInvites(
                serverUrl,
                teamId,
                selectedIds,
                customOptions,
                formatMessage,
            );

            expect(mockSendGuestEmailInvitesToTeam).toHaveBeenCalledWith(
                serverUrl,
                teamId,
                [email],
                options.selectedChannels,
                'Welcome to the team!',
            );
        });

        it('should not include custom message when includeCustomMessage is false', async () => {
            const email = 'guest@example.com';
            const selectedIds = {[email]: email};

            const customOptions = {
                ...options,
                includeCustomMessage: false,
                customMessage: 'Welcome to the team!',
            };

            mockSendGuestEmailInvitesToTeam.mockResolvedValue({
                members: [{email, error: undefined}],
                error: undefined,
            });

            await sendGuestInvites(
                serverUrl,
                teamId,
                selectedIds,
                customOptions,
                formatMessage,
            );

            expect(mockSendGuestEmailInvitesToTeam).toHaveBeenCalledWith(
                serverUrl,
                teamId,
                [email],
                options.selectedChannels,
                '',
            );
        });

        it('should handle empty members response from sendGuestEmailInvitesToTeam', async () => {
            const email = 'guest@example.com';
            const selectedIds = {[email]: email};

            mockSendGuestEmailInvitesToTeam.mockResolvedValue({
                members: [],
                error: undefined,
            });

            const result = await sendGuestInvites(
                serverUrl,
                teamId,
                selectedIds,
                options,
                formatMessage,
            );

            expect(result.sent).toHaveLength(0);
            expect(result.notSent).toHaveLength(1);
            expect(result.notSent[0].email).toBe(email);
            expect(result.notSent[0].reason).toBe('Failed to send email invitation');
        });

        it('should handle user error from addUsersToTeam member response', async () => {
            const userId = 'user-1';
            const user = TestHelper.fakeUser({id: userId, roles: 'system_guest'});
            const selectedIds = {[userId]: user};

            mockAddUsersToTeam.mockResolvedValue({
                members: [{member: TestHelper.fakeTeamMember(userId, 'team-1'), user_id: userId, error: {message: 'User error'} as any}],
                error: undefined,
            });

            const result = await sendGuestInvites(
                serverUrl,
                teamId,
                selectedIds,
                options,
                formatMessage,
            );

            expect(result.sent).toHaveLength(0);
            expect(result.notSent).toHaveLength(1);
            expect(result.notSent[0].userId).toBe(userId);
            expect(result.notSent[0].reason).toBe('User error');
        });

        it('should handle empty members array from addUsersToTeam', async () => {
            const userId = 'user-1';
            const user = {id: userId, roles: 'system_guest'} as UserProfile;
            const selectedIds = {[userId]: user};

            mockAddUsersToTeam.mockResolvedValue({
                members: [],
                error: undefined,
            });

            const result = await sendGuestInvites(
                serverUrl,
                teamId,
                selectedIds,
                options,
                formatMessage,
            );

            expect(result.sent).toHaveLength(0);
            expect(result.notSent).toHaveLength(1);
            expect(result.notSent[0].userId).toBe(userId);
            expect(result.notSent[0].reason).toBe('Unknown error');
        });
    });
});

