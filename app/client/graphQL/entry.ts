// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {MEMBERS_PER_PAGE} from '@constants/graphql';
import NetworkManager from '@managers/network_manager';

import {Client} from '../rest';

import {GQLResponse} from './types';

const doGQLQuery = async (serverUrl: string, query: string, operationName: string) => {
    let client: Client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }

    try {
        const response = await client.doFetch('/api/v5/graphql', {method: 'post', body: JSON.stringify({query, operationName})}) as GQLResponse;
        return response;
    } catch (error) {
        return {error};
    }
};

export const gqlEntry = async (serverUrl: string) => {
    return doGQLQuery(serverUrl, entryQuery, 'entry');
};

export const gqlEntryChannels = async (serverUrl: string, teamId: string) => {
    const response = await doGQLQuery(serverUrl, channelsQuery(teamId, false), 'channels');
    if ('error' in response || response.errors) {
        return response;
    }

    let members = response.data.channelMembers;

    while (members?.length === MEMBERS_PER_PAGE) {
        let pageResponse;
        try {
            // eslint-disable-next-line no-await-in-loop
            pageResponse = await gqlEntryChannelsNextPage(serverUrl, teamId, members[members.length - 1].cursor!, false);
        } catch {
            break;
        }

        if ('error' in pageResponse) {
            break;
        }

        members = pageResponse.data.channelMembers!;
        response.data.channelMembers?.push(...members);
    }

    return response;
};
const gqlEntryChannelsNextPage = async (serverUrl: string, teamId: string, cursor: string, exclude: boolean) => {
    return doGQLQuery(serverUrl, nextPageChannelsQuery(teamId, cursor, exclude), 'channelsNextPage');
};

export const gqlOtherChannels = async (serverUrl: string, teamId: string) => {
    const response = await doGQLQuery(serverUrl, channelsQuery(teamId, true), 'channels');
    if ('error' in response || response.errors) {
        return response;
    }

    let members = response.data.channelMembers;

    while (members?.length === MEMBERS_PER_PAGE) {
        let pageResponse;
        try {
            // eslint-disable-next-line no-await-in-loop
            pageResponse = await gqlEntryChannelsNextPage(serverUrl, teamId, members[members.length - 1].cursor!, true);
        } catch {
            break;
        }

        if ('error' in pageResponse || 'errors' in pageResponse) {
            break;
        }

        members = pageResponse.data.channelMembers!;
        response.data.channelMembers?.push(...members);
    }

    return response;
};

export const gqlAllChannels = async (serverUrl: string) => {
    const response = await doGQLQuery(serverUrl, allChannelsQuery, 'all_channels');
    if ('error' in response || response.errors) {
        return response;
    }

    let members = response.data.channelMembers;

    while (members?.length === MEMBERS_PER_PAGE) {
        let pageResponse;
        try {
            // eslint-disable-next-line no-await-in-loop
            pageResponse = await gqlAllChannelsNextPage(serverUrl, members[members.length - 1].cursor!);
        } catch {
            break;
        }

        if ('error' in pageResponse || 'errors' in pageResponse) {
            break;
        }

        members = pageResponse.data.channelMembers!;
        response.data.channelMembers?.push(...members);
    }

    return response;
};

const gqlAllChannelsNextPage = async (serverUrl: string, cursor: string) => {
    return doGQLQuery(serverUrl, nextPageAllChannelsQuery(cursor), 'channelsNextPage');
};

const entryQuery = `
query entry {
    config
    license
    user(id:"me") {
        id
        authService
        deleteAt
        email
        #updateAt
        firstName
        lastName
        lastPictureUpdateAt
        locale
        nickname
        position
        roles {
            id
            name
            permissions
        }
        username
        notifyProps
        props
        timezone
        isBot
        status {
            status
        }
        preferences{
            category
            name
            value
            userId
        }
        sessions {
            createAt
            expiresAt
        }
    }
    teamMembers(userId:"me") {
        deleteAt
        roles {
            id
            name
            permissions
        }
        team {
            id
            description
            displayName
            name
            type
            allowedDomains
            lastTeamIconUpdate
            groupConstrained
            allowOpenInvite
            updateAt
        }
    }
}
`;

const channelsQuery = (teamId: string, exclude: boolean) => {
    return `
query channels {
    channelMembers(userId:"me", first:PER_PAGE, teamId:"TEAM_ID", excludeTeam:EXCLUDE) {
        cursor
        msgCount
        mentionCount
        lastViewedAt
        notifyProps
        roles {
            id
            name
            permissions
        }
        channel {
            id
            header
            purpose
            type
            createAt
            creatorId
            deleteAt
            displayName
            prettyDisplayName
            groupConstrained
            name
            shared
            lastPostAt
            totalMsgCount
            team {
                id
            }
        }
    }
    sidebarCategories(userId:"me", teamId:"TEAM_ID", excludeTeam:EXCLUDE) {
        displayName
        id
        sorting
        type
        muted
        collapsed
        channelIds
        teamId
    }
}
`.replace('PER_PAGE', `${MEMBERS_PER_PAGE}`).
        replace('TEAM_ID', teamId).replace('TEAM_ID', teamId).
        replace('EXCLUDE', String(exclude)).replace('EXCLUDE', String(exclude));
};

const nextPageChannelsQuery = (teamId: string, cursor: string, exclude: boolean) => {
    return `
query channelsNextPage {
    channelMembers(userId:"me", first:PER_PAGE, after:"CURSOR", teamId:"TEAM_ID", excludeTeam:EXCLUDE) {
        cursor
        msgCount
        mentionCount
        lastViewedAt
        notifyProps
        roles {
            id
            name
            permissions
        }
        channel {
            id
            header
            purpose
            type
            createAt
            creatorId
            deleteAt
            displayName
            prettyDisplayName
            groupConstrained
            name
            shared
            lastPostAt
            totalMsgCount
            team {
                id
            }
        }
    }
}
`.replace('PER_PAGE', `${MEMBERS_PER_PAGE}`).
        replace('CURSOR', cursor).
        replace('TEAM_ID', teamId).
        replace('EXCLUDE', String(exclude));
};

const allChannelsQuery = `
query all_channels {
    channelMembers(userId:"me", first:PER_PAGE) {
        cursor
        msgCount
        mentionCount
        lastViewedAt
        notifyProps
        channel {
            id
            header
            purpose
            type
            createAt
            creatorId
            deleteAt
            displayName
            prettyDisplayName
            groupConstrained
            name
            shared
            lastPostAt
            totalMsgCount
            team {
                id
            }
        }
    }
}
`.replace('PER_PAGE', `${MEMBERS_PER_PAGE}`);

const nextPageAllChannelsQuery = (cursor: string) => {
    return `
query loginNextPage {
    channelMembers(userId:"me", first:PER_PAGE, after:"CURSOR") {
        cursor
        msgCount
        mentionCount
        lastViewedAt
        notifyProps
        channel {
            id
            header
            purpose
            type
            createAt
            creatorId
            deleteAt
            displayName
            prettyDisplayName
            groupConstrained
            name
            shared
            lastPostAt
            totalMsgCount
            team {
                id
            }
        }
    }
}
`.replace('PER_PAGE', `${MEMBERS_PER_PAGE}`).
        replace('CURSOR', cursor);
};
