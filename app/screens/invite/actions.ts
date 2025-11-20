// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {addMembersToChannel} from '@actions/remote/channel';
import {addUsersToTeam, getTeamMembersByIds, sendEmailInvitesToTeam, sendGuestEmailInvitesToTeam} from '@actions/remote/team';
import {ServerErrors} from '@constants';
import {getErrorMessage} from '@utils/errors';
import {secureGetFromRecord} from '@utils/types';
import {isGuest} from '@utils/user';

import type {InviteResult, Result, SearchResult, SendOptions} from './types';
import type {IntlShape} from 'react-intl';

export async function sendMembersInvites(serverUrl: string, teamId: string, selectedIds: {[id: string]: SearchResult}, isAdmin: boolean, teamDisplayName: string, formatMessage: IntlShape['formatMessage']) {
    const userIds = [];
    const emails = [];

    const errorResult: Result & {error: boolean} = {sent: [], notSent: [], error: true};

    for (const [id, item] of Object.entries(selectedIds)) {
        if (typeof item === 'string') {
            emails.push(item);
        } else {
            userIds.push(id);
        }
    }

    const currentMemberIds = new Set();

    if (userIds.length) {
        const {members: currentTeamMembers = [], error: getTeamMembersByIdsError} = await getTeamMembersByIds(serverUrl, teamId, userIds);

        if (getTeamMembersByIdsError) {
            return errorResult;
        }

        for (const {user_id: currentMemberId} of currentTeamMembers) {
            currentMemberIds.add(currentMemberId);
        }
    }

    const sent: InviteResult[] = [];
    const notSent: InviteResult[] = [];
    const usersToAdd = [];

    for (const userId of userIds) {
        if (isGuest((selectedIds[userId] as UserProfile).roles)) {
            notSent.push({userId, reason: formatMessage({id: 'invite.members.user_is_guest', defaultMessage: 'Contact your admin to make this guest a full member'})});
        } else if (currentMemberIds.has(userId)) {
            notSent.push({userId, reason: formatMessage({id: 'invite.members.already_member', defaultMessage: 'This person is already a team member'})});
        } else {
            usersToAdd.push(userId);
        }
    }

    if (usersToAdd.length) {
        const {members, error: addUsersToTeamError} = await addUsersToTeam(serverUrl, teamId, usersToAdd);

        if (addUsersToTeamError) {
            return errorResult;
        }

        if (members) {
            const membersWithError: Record<string, string> = {};
            for (const {user_id, error} of members) {
                if (error) {
                    membersWithError[user_id] = error.message;
                }
            }

            for (const userId of usersToAdd) {
                if (membersWithError[userId]) {
                    notSent.push({userId, reason: membersWithError[userId]});
                } else {
                    sent.push({userId, reason: formatMessage({id: 'invite.summary.member_invite', defaultMessage: 'Invited as a member of {teamDisplayName}'}, {teamDisplayName})});
                }
            }
        }
    }

    if (emails.length) {
        const {members, error: sendEmailInvitesToTeamError} = await sendEmailInvitesToTeam(serverUrl, teamId, emails);

        if (sendEmailInvitesToTeamError) {
            return errorResult;
        }

        if (members) {
            const membersWithError: Record<string, string> = {};
            for (const {email, error} of members) {
                if (error) {
                    membersWithError[email] = isAdmin && error.server_error_id === ServerErrors.SEND_EMAIL_WITH_DEFAULTS_ERROR ? (
                        formatMessage({id: 'invite.summary.smtp_failure', defaultMessage: 'SMTP is not configured in System Console'})
                    ) : (
                        error.message
                    );
                }
            }

            for (const email of emails) {
                const error = secureGetFromRecord(membersWithError, email);
                if (error) {
                    notSent.push({userId: email, reason: error});
                } else {
                    sent.push({userId: email, reason: formatMessage({id: 'invite.summary.email_invite', defaultMessage: 'An invitation email has been sent'})});
                }
            }
        }
    }

    return {sent, notSent, error: false};
}

export async function sendGuestInvites(serverUrl: string, teamId: string, selectedIds: {[id: string]: SearchResult}, options: SendOptions, formatMessage: IntlShape['formatMessage']) {
    const userIds = [];
    const emails = [];

    for (const [id, item] of Object.entries(selectedIds)) {
        if (typeof item === 'string') {
            emails.push(item);
        } else {
            userIds.push(id);
        }
    }

    const sent: InviteResult[] = [];
    const notSent: InviteResult[] = [];

    if (userIds.length) {
        const {sent: sentForUsers, notSent: notSentForUsers} = await sendGuestInviteForUsers(serverUrl, teamId, selectedIds, userIds, options, formatMessage);
        sent.push(...sentForUsers);
        notSent.push(...notSentForUsers);
    }

    if (emails.length) {
        const {sent: sentForMails, notSent: notSentForMails} = await sendGuestInviteForMails(serverUrl, teamId, emails, options, formatMessage);
        sent.push(...sentForMails);
        notSent.push(...notSentForMails);
    }

    return {sent, notSent};
}

async function sendGuestInviteForUsers(serverUrl: string, teamId: string, selectedIds: {[id: string]: SearchResult}, userIds: string[], options: SendOptions, formatMessage: IntlShape['formatMessage']) {
    const sent: InviteResult[] = [];
    const notSent: InviteResult[] = [];

    for await (const userId of userIds) {
        const user = selectedIds[userId] as UserProfile;
        if (!isGuest(user.roles)) {
            notSent.push({userId, reason: formatMessage({id: 'invite.members.user_is_not_guest', defaultMessage: 'This person is already a member of the workspace. Invite them as a member instead of a guest.'})});
            continue;
        }

        const {members, error} = await addUsersToTeam(serverUrl, teamId, [userId]);
        if (error) {
            notSent.push({userId, reason: getErrorMessage(error)});
            continue;
        }
        if (!members || members.length === 0 || members[0].error) {
            notSent.push({userId, reason: getErrorMessage(members?.[0]?.error)});
            continue;
        }

        let channelsAdded = 0;
        let channelsFailed = 0;
        for await (const channel of options.selectedChannels) {
            const {channelMemberships, error: addMembersToChannelError} = await addMembersToChannel(serverUrl, channel, [userId]);
            if (addMembersToChannelError) {
                channelsFailed++;
                continue;
            }
            if (!channelMemberships || channelMemberships.length === 0) {
                channelsFailed++;
                continue;
            }
            channelsAdded++;
        }

        if (channelsFailed > 0) {
            notSent.push({userId, reason: formatMessage({id: 'invite.summary.guest_invite_failed', defaultMessage: 'Unable to add user to {channelsFailed, plural, one {# channel} other {# channels}}'}, {channelsFailed})});
            continue;
        }

        sent.push({userId, reason: formatMessage({id: 'invite.summary.guest_invite', defaultMessage: 'This guest has been added to the team and {count, plural, one {# channel} other {# channels}}.'}, {count: channelsAdded})});
    }
    return {sent, notSent};
}

async function sendGuestInviteForMails(serverUrl: string, teamId: string, emails: string[], options: SendOptions, formatMessage: IntlShape['formatMessage']) {
    const sent: InviteResult[] = [];
    const notSent: InviteResult[] = [];
    const message = options.includeCustomMessage ? options.customMessage : '';
    const response = await sendGuestEmailInvitesToTeam(serverUrl, teamId, emails, options.selectedChannels, message);
    if (response.error) {
        notSent.push(...emails.map((email) => ({userId: email, reason: getErrorMessage(response.error)})));
        return {sent, notSent};
    }
    if (!response.members || response.members.length === 0) {
        notSent.push(...emails.map((email) => ({email, reason: formatMessage({id: 'invite.summary.email_invite_failed', defaultMessage: 'Failed to send email invitation'})})));
        return {sent, notSent};
    }

    for (const member of response.members) {
        if (member.error) {
            notSent.push({email: member.email, reason: getErrorMessage(member.error)});
            continue;
        }
        sent.push({email: member.email, reason: formatMessage({id: 'invite.summary.email_invite', defaultMessage: 'An invitation email has been sent'})});
    }

    return {sent, notSent};
}
