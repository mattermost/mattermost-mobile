// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {MEMBERS_PER_PAGE} from '@constants/graphql';
import NetworkManager from '@managers/network_manager';

import QueryNames from './constants';

import type {Client} from '@client/rest';

const doGQLQuery = async (serverUrl: string, query: string, variables: {[name: string]: any}, operationName: string) => {
    let client: Client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }

    try {
        const response = await client.doFetch('/api/v5/graphql', {method: 'post', body: {query, variables, operationName}}) as GQLResponse;
        return response;
    } catch (error) {
        return {error};
    }
};

export const gqlEntry = async (serverUrl: string) => {
    return doGQLQuery(serverUrl, entryQuery, {}, QueryNames.QUERY_ENTRY);
};

export const gqlEntryChannels = async (serverUrl: string, teamId: string) => {
    const variables = {
        teamId,
        exclude: false,
        perPage: MEMBERS_PER_PAGE,
    };
    const response = await doGQLQuery(serverUrl, channelsQuery, variables, QueryNames.QUERY_CHANNELS);
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
    const variables = {
        teamId,
        exclude,
        perPage: MEMBERS_PER_PAGE,
        cursor,
    };
    return doGQLQuery(serverUrl, nextPageChannelsQuery, variables, QueryNames.QUERY_CHANNELS_NEXT);
};

export const gqlOtherChannels = async (serverUrl: string, teamId: string) => {
    const variables = {
        teamId,
        exclude: true,
        perPage: MEMBERS_PER_PAGE,
    };
    const response = await doGQLQuery(serverUrl, channelsQuery, variables, QueryNames.QUERY_CHANNELS);
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
    const variables = {
        perPage: MEMBERS_PER_PAGE,
    };
    const response = await doGQLQuery(serverUrl, allChannelsQuery, variables, QueryNames.QUERY_ALL_CHANNELS);
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
    const variables = {
        perPage: MEMBERS_PER_PAGE,
        cursor,
    };
    return doGQLQuery(serverUrl, nextPageAllChannelsQuery, variables, QueryNames.QUERY_ALL_CHANNELS_NEXT);
};

const entryQuery = `
query ${QueryNames.QUERY_ENTRY} {
    config
    license
    user(id:"me") {
        id
        createAt
        updateAt
        deleteAt
        username
        authService
        email
        emailVerified
        nickname
        firstName
        lastName
        position
        roles {
            id
            name
            permissions
        }
        locale
        notifyProps
        props
        timezone
        isBot
        lastPictureUpdate
        remoteId
        status {
            status
        }
        botDescription
        botLastIconUpdate
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
        termsOfServiceId
        termsOfServiceCreateAt
    }
    teamMembers(userId:"me") {
        deleteAt
        schemeAdmin
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
            createAt
            updateAt
            deleteAt
            schemeId
            policyId
            cloudLimitsArchived
        }
    }
}
`;

const channelsQuery = `
query ${QueryNames.QUERY_CHANNELS}($teamId: String!, $perPage: Int!, $exclude: Boolean!) {
    channelMembers(userId:"me", first:$perPage, teamId:$teamId, excludeTeam:$exclude) {
        cursor
        msgCount
        msgCountRoot
        mentionCount
        mentionCountRoot
        schemeAdmin
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
            updateAt
            creatorId
            deleteAt
            displayName
            prettyDisplayName
            groupConstrained
            name
            shared
            lastPostAt
            totalMsgCount
            totalMsgCountRoot
            lastRootPostAt
            team {
                id
            }
        }
    }
    sidebarCategories(userId:"me", teamId:$teamId, excludeTeam:$exclude) {
        displayName
        id
        sortOrder
        sorting
        type
        muted
        collapsed
        channelIds
        teamId
    }
}
`;

const nextPageChannelsQuery = `
query ${QueryNames.QUERY_CHANNELS_NEXT}($teamId: String!, $perPage: Int!, $exclude: Boolean!, $cursor: String!) {
    channelMembers(userId:"me", first:$perPage, after:$cursor, teamId:$teamId, excludeTeam:$exclude) {
        cursor
        msgCount
        msgCountRoot
        mentionCount
        mentionCountRoot
        schemeAdmin
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
            updateAt
            creatorId
            deleteAt
            displayName
            prettyDisplayName
            groupConstrained
            name
            shared
            lastPostAt
            totalMsgCount
            totalMsgCountRoot
            lastRootPostAt
            team {
                id
            }
        }
    }
}
`;

const allChannelsQuery = `
query ${QueryNames.QUERY_ALL_CHANNELS}($perPage: Int!){
    channelMembers(userId:"me", first:$perPage) {
        cursor
        msgCount
        msgCountRoot
        mentionCount
        mentionCountRoot
        schemeAdmin
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
            updateAt
            creatorId
            deleteAt
            displayName
            prettyDisplayName
            groupConstrained
            name
            shared
            lastPostAt
            totalMsgCount
            totalMsgCountRoot
            lastRootPostAt
            team {
                id
            }
        }
    }
}
`;

const nextPageAllChannelsQuery = `
query ${QueryNames.QUERY_ALL_CHANNELS_NEXT}($perPage: Int!, $cursor: String!) {
    channelMembers(userId:"me", first:$perPage, after:$cursor) {
        cursor
        msgCount
        msgCountRoot
        mentionCount
        mentionCountRoot
        schemeAdmin
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
            updateAt
            creatorId
            deleteAt
            displayName
            prettyDisplayName
            groupConstrained
            name
            shared
            lastPostAt
            totalMsgCount
            totalMsgCountRoot
            lastRootPostAt
            team {
                id
            }
        }
    }
}
`;
