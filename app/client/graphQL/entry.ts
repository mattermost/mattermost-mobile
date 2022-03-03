import NetworkManager from '@init/network_manager';
import { Client } from '../rest';
import { GQLQuery } from './types';

const doGQLQuery = async (serverUrl: string, query: string) => {
    let client: Client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }

    try {
        const data = await client.doFetch('/api/v5/graphql', {method: 'post', body: JSON.stringify({query})}) as GQLQuery;

        return {data}
    } catch (error) {
        return {error}
    }
}

export const gqlLogin = async (serverUrl: string) => {
    return doGQLQuery(serverUrl, loginQuery);
}

const loginQuery = `
{
    #session(id:"me") {
    #  createAt
    #  expiresAt
    #}
    config
    license
    user(id:"me") {
        preferences{
            category
            name
            value
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
            # lastTeamIconUpdate
            # groupConstrained
            # allowOpenInvite
            # updateAt
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
    }
    channelMembers(userId:"me") {
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
            # groupConstrained
            name
            # shared
            # lastPostAt
            # totalMsgCount
            # stats {
            #   guestCount
            #   memberCount
            #   pinnedPostCount
            # }
        }
    }
}
`
