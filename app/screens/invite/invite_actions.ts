// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {addMembersToChannel} from '@actions/remote/channel';
import {
    getTeamMembersByIds,
    addUsersToTeam,
    sendEmailInvitesToTeam,
    sendEmailGuestInvitesToChannels,
} from '@actions/remote/team';
import {ServerErrors} from '@constants';
import DatabaseManager from '@database/manager';
import {queryUsersOnChannel} from '@queries/servers/channel';
import {isGuest} from '@utils/user';

import type {Invites, InviteResult, Result} from './invite_types';
import type {UserModel} from '@database/models/server';
import type {IntlShape} from 'react-intl';

const getInvitesByTypes = (invites: Invites) => {
    const userIds = [];
    const emails = [];

    for (const [id, item] of Object.entries(invites)) {
        if (typeof item === 'string') {
            emails.push(item);
        } else {
            userIds.push(id);
        }
    }

    return {userIds, emails};
};

const getCurrentMembersByIds = async (serverUrl: string, teamId: string, userIds: string[]) => {
    const currentMemberIds = new Set();

    if (userIds.length) {
        const {members: currentTeamMembers = [], error: getTeamMembersByIdsError} = await getTeamMembersByIds(serverUrl, teamId, userIds);

        if (getTeamMembersByIdsError) {
            return {error: getTeamMembersByIdsError};
        }

        for (const {user_id: currentMemberId} of currentTeamMembers) {
            currentMemberIds.add(currentMemberId);
        }
    }

    return {data: currentMemberIds};
};

export const sendMembersInvites = async (
    serverUrl: string,
    teamId: string,
    teamDisplayName: string,
    invites: Invites,
    intl: IntlShape,
    isAdmin?: boolean,
) => {
    const {formatMessage} = intl;
    const {userIds, emails} = getInvitesByTypes(invites);

    let currentMemberIds = new Set();

    if (userIds.length) {
        const {data: currentTeamMembers, error: getTeamMembersByIdsError} = await getCurrentMembersByIds(serverUrl, teamId, userIds);

        if (getTeamMembersByIdsError) {
            return {error: getTeamMembersByIdsError};
        } else if (currentTeamMembers) {
            currentMemberIds = currentTeamMembers;
        }
    }

    const sent: InviteResult[] = [];
    const notSent: InviteResult[] = [];
    const usersToAdd = [];

    for (const userId of userIds) {
        if (isGuest((invites[userId] as UserProfile).roles)) {
            notSent.push({
                userId,
                reason: formatMessage({
                    id: 'invite.members.user_is_guest',
                    defaultMessage: 'Contact your admin to make this guest a full member',
                }),
            });
        } else if (currentMemberIds.has(userId)) {
            notSent.push({
                userId,
                reason: formatMessage({
                    id: 'invite.members.already_member',
                    defaultMessage: 'This person is already a team member',
                }),
            });
        } else {
            usersToAdd.push(userId);
        }
    }

    if (usersToAdd.length) {
        const {members, error: addUsersToTeamError} = await addUsersToTeam(serverUrl, teamId, usersToAdd);

        if (addUsersToTeamError) {
            return {error: addUsersToTeamError};
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
                    sent.push({
                        userId,
                        reason: formatMessage(
                            {
                                id: 'invite.summary.member_invite',
                                defaultMessage: 'Invited as a member of {teamDisplayName}',
                            },
                            {teamDisplayName},
                        )});
                }
            }
        }
    }

    if (emails.length) {
        const {members, error: sendEmailInvitesToTeamError} = await sendEmailInvitesToTeam(serverUrl, teamId, emails);

        if (sendEmailInvitesToTeamError) {
            return {error: sendEmailInvitesToTeamError};
        }

        if (members) {
            const membersWithError: Record<string, string> = {};
            for (const {email, error} of members) {
                if (error) {
                    membersWithError[email] = isAdmin && error.server_error_id === ServerErrors.SEND_EMAIL_WITH_DEFAULTS_ERROR ? (
                        formatMessage({
                            id: 'invite.summary.smtp_failure',
                            defaultMessage: 'SMTP is not configured in System Console',
                        })
                    ) : (
                        error.message
                    );
                }
            }

            for (const email of emails) {
                if (membersWithError[email]) {
                    notSent.push({userId: email, reason: membersWithError[email]});
                } else {
                    sent.push({
                        userId: email,
                        reason: formatMessage({
                            id: 'invite.summary.email_invite',
                            defaultMessage: 'An invitation email has been sent',
                        }),
                    });
                }
            }
        }
    }

    return {
        data: {
            sent,
            notSent,
        } as Result,
    };
};

export const sendGuestInviteForUser = async (
    serverUrl: string,
    userId: string,
    teamId: string,
    teamDisplayName: string,
    channels: Channel[],
    channelsMembers: {[channelId: string]: UserModel[]},
    intl: IntlShape,
) => {
    const {formatMessage} = intl;

    let memberOfAll = true;
    let memberOfAny = 0;

    for (const {id: channelId} of channels) {
        const memberOfChannel = channelsMembers[channelId].find(({id}) => userId === id);

        if (memberOfChannel) {
            memberOfAny += 1;
        } else {
            memberOfAll = false;
        }
    }

    if (memberOfAll) {
        return {
            notSent: {
                userId,
                reason: formatMessage({
                    id: 'invite.guests.all_channels_member',
                    defaultMessage: 'This person is already a member of all the channels',
                }),
            },
        };
    }

    const {error: addUsersToTeamError} = await addUsersToTeam(serverUrl, teamId, [userId]);

    if (addUsersToTeamError) {
        return {
            notSent: {
                userId,
                reason: formatMessage({
                    id: 'invite.guests.error_adding_to_team',
                    defaultMessage: 'Unable to add the guest to the team',
                }),
            },
        };
    }

    const modelPromises: Array<ReturnType<typeof addMembersToChannel>> = [];

    for (const {id: channelId} of channels) {
        const addMemberToChannel = addMembersToChannel(serverUrl, channelId, [userId]);
        modelPromises.push(addMemberToChannel);
    }

    const memberOfChannels = await Promise.all(modelPromises);

    for (const {error} of memberOfChannels) {
        if (error) {
            return {
                notSent: {
                    userId,
                    reason: formatMessage({
                        id: 'invite.guests.error_adding_to_channels',
                        defaultMessage: 'Unable to add the guest to the channels',
                    }),
                },
            };
        }
    }

    if (memberOfAny) {
        return {
            sent: {
                userId,
                reason: formatMessage(
                    {
                        id: 'invite.guests.some_channels_member',
                        defaultMessage: 'This person is already a team member. Invited to {count} {count, plural, one {channel} other {channels}}',
                    },
                    {count: channels.length - memberOfAny},
                ),
            },
        };
    }

    return {
        sent: {
            userId,
            reason: formatMessage(
                {
                    id: 'invite.guests.added_to_channels',
                    defaultMessage: 'Invited as a member of {teamDisplayName} and {count} {count, plural, one {channel} other {channels}}',
                },
                {
                    teamDisplayName,
                    count: channels.length,
                },
            ),
        },
    };
};

export const sendGuestsInvites = async (
    serverUrl: string,
    teamId: string,
    teamDisplayName: string,
    invites: Invites,
    channels: Channel[],
    message: string,
    intl: IntlShape,
    isAdmin?: boolean,
) => {
    const {formatMessage} = intl;
    const {userIds, emails} = getInvitesByTypes(invites);

    const sent: InviteResult[] = [];
    const notSent: InviteResult[] = [];

    const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
    const modelPromises: Array<Promise<void>> = [];
    const channelsMembers: {[channelId: string]: UserModel[]} = {};

    for (const {id: channelId} of channels) {
        const usersOnChannel = queryUsersOnChannel(database, channelId).fetch().then(
            (users) => {
                channelsMembers[channelId] = users;
            });
        modelPromises.push(usersOnChannel);
    }

    await Promise.all(modelPromises);

    const usersResults = await Promise.all(
        userIds.map((userId) => (
            sendGuestInviteForUser(
                serverUrl,
                userId,
                teamId,
                teamDisplayName,
                channels,
                channelsMembers,
                intl,
            )
        )),
    );

    for (const {sent: userSent, notSent: userNotSent} of usersResults) {
        if (userSent) {
            sent.push(userSent);
        }

        if (userNotSent) {
            notSent.push(userNotSent);
        }
    }

    if (emails.length) {
        const {members, error: sendEmailGuestInvitesToChannelError} = await sendEmailGuestInvitesToChannels(serverUrl, teamId, channels.map(({id}) => id), emails, message);

        if (sendEmailGuestInvitesToChannelError) {
            if ((sendEmailGuestInvitesToChannelError as ApiError).server_error_id === ServerErrors.SEND_EMAIL_RATE_LIMIT_EXCEEDED_ERROR) {
                const reason = formatMessage({
                    id: 'invite.guests.rate_limit_exceeded',
                    defaultMessage: 'Invite emails rate limit exceeded',
                });

                for (const email of emails) {
                    notSent.push({userId: email, reason});
                }
            } else {
                return {error: sendEmailGuestInvitesToChannelError};
            }
        }

        if (members) {
            const membersWithError: Record<string, string> = {};
            for (const {email, error} of members) {
                if (error) {
                    membersWithError[email] = isAdmin && error.server_error_id === ServerErrors.SEND_EMAIL_WITH_DEFAULTS_ERROR ? (
                        formatMessage({
                            id: 'invite.summary.smtp_failure',
                            defaultMessage: 'SMTP is not configured in System Console',
                        })
                    ) : (
                        error.message
                    );
                }
            }

            for (const email of emails) {
                if (membersWithError[email]) {
                    notSent.push({userId: email, reason: membersWithError[email]});
                } else {
                    sent.push({
                        userId: email,
                        reason: formatMessage({
                            id: 'invite.summary.email_invite',
                            defaultMessage: 'An invitation email has been sent',
                        }),
                    });
                }
            }
        }
    }

    return {
        data: {
            sent,
            notSent,
        } as Result,
    };
};
