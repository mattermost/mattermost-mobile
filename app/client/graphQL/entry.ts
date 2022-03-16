// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {MEMBERS_PER_PAGE} from '@constants/graphql';
import NetworkManager from '@init/network_manager';

import {Client} from '../rest';

import {GQLResponse} from './types';

const doGQLQuery = async (serverUrl: string, query: string) => {
    let client: Client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }

    try {
        const response = await client.doFetch('/api/v5/graphql', {method: 'post', body: JSON.stringify({query})}) as GQLResponse;
        return response;
    } catch (error) {
        return {error};
    }
};

export const gqlLogin = async (serverUrl: string) => {
    const response = await doGQLQuery(serverUrl, loginQuery);

    if ('error' in response) {
        return response;
    }

    let members = response.data.channelMembers;

    while (members?.length === MEMBERS_PER_PAGE) {
        let pageResponse;
        try {
            // eslint-disable-next-line no-await-in-loop
            pageResponse = await gqlLoginNextPage(serverUrl, members[members.length - 1].cursor!);
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

export const gqlLoginNextPage = async (serverUrl: string, cursor: string) => {
    return doGQLQuery(serverUrl, nextPageLoginQuery(cursor));
};

const loginQuery = `
{
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
        sidebarCategories {
            id
            displayName
            sorting
            # sortOrder
            muted
            collapsed
            type
            channelIds
        }
        user {
            id
        }
    }
    channelMembers(userId:"me", first:PER_PAGE) {
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
            # stats {
            #   guestCount
            #   memberCount
            #   pinnedPostCount
            # }
        }
        user {
            id
        }
    }
}
`.replace('PER_PAGE', `${MEMBERS_PER_PAGE}`);

const nextPageLoginQuery = (cursor: string) => {
    return `
{
    channelMembers(userId:"me", first:PER_PAGE, after:"CURSOR") {
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
            # stats {
            #   guestCount
            #   memberCount
            #   pinnedPostCount
            # }
        }
        user {
            id
        }
    }
}
`.replace('PER_PAGE', `${MEMBERS_PER_PAGE}`).
        replace('CURSOR', cursor);
};
