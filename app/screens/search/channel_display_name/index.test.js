// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {General} from '@mm-redux/constants';

import {makeMapStateToProps} from './index';

describe('components/SearchResultsItem/WithStore', () => {
    const team = {
        id: 'team_id',
        display_name: 'team display name',
        name: 'team_name',
    };

    const otherTeam = {
        id: 'other_team_id',
        display_name: 'other team display name',
        name: 'other_team_name',
    };

    const currentUserID = 'other';
    const user = {
        id: 'user_id',
        username: 'username',
        is_bot: false,
    };
    const channel = {
        id: 'channel_id_open',
        type: General.OPEN_CHANNEL,
        team_id: team.id,
        name: 'open channel',
        display_name: 'open channel',
    };

    const dmChannel = {
        id: 'channel_id_dm',
        type: General.DM_CHANNEL,
        name: `${currentUserID}__${user.id}`,
        display_name: `${currentUserID}__${user.id}`,
    };

    const post = {
        channel_id: channel.id,
        create_at: 1502715365009,
        delete_at: 0,
        edit_at: 1502715372443,
        id: 'id',
        is_pinned: false,
        message: 'post message',
        original_id: '',
        pending_post_id: '',
        props: {},
        root_id: '',
        type: '',
        update_at: 1502715372443,
        user_id: 'user_id',
        reply_count: 0,
    };

    const defaultState = {
        entities: {
            general: {
                config: {
                    EnablePostUsernameOverride: 'true',
                },
                license: {},
            },
            users: {
                profiles: {
                    [user.id]: user,
                },
                currentUserId: currentUserID,
                statuses: {},
                profilesInChannel: {},
            },
            channels: {
                channels: {
                    [channel.id]: channel,
                    [dmChannel.id]: dmChannel,
                },
            },
            teams: {
                myMembers: {
                    [team.id]: {},
                },
                teams: {
                    [team.id]: team,
                    [otherTeam.id]: otherTeam,
                },
                currentTeamId: team.id,
            },
            posts: {
                posts: {
                    [post.id]: post,
                },
                postsInThread: {},
            },
            preferences: {
                myPreferences: {
                    hasOwnProperty: () => true,
                },
            },
        },
    };

    const defaultProps = {
        postId: post.id,
    };

    const mstp = makeMapStateToProps();

    test('should not show team name if user only belongs to one team', () => {
        const newProps = mstp(defaultState, defaultProps);
        expect(newProps.teamName).toBe('');
    });

    test('should show team name for open and private channels when user belongs to more than one team', () => {
        let state = {
            ...defaultState,
            entities: {
                ...defaultState.entities,
                teams: {
                    ...defaultState.entities.teams,
                    myMembers: {
                        ...defaultState.entities.teams.myMembers,
                        [otherTeam.id]: {},
                    },
                },
            },
        };
        let newProps = mstp(state, defaultProps);
        expect(newProps.teamName).toBe(team.display_name);

        state = {
            ...state,
            entities: {
                ...state.entities,
                channels: {
                    ...state.entities.channels,
                    channels: {
                        ...state.entities.channels.channels,
                        [channel.id]: {
                            ...channel,
                            type: General.PRIVATE_CHANNEL,
                        },
                    },
                },
            },
        };

        newProps = mstp(state, defaultProps);
        expect(newProps.teamName).toBe(team.display_name);
    });

    test('should not show team name for dm and group channels when user belongs to more than one team', () => {
        let state = {
            ...defaultState,
            entities: {
                ...defaultState.entities,
                teams: {
                    ...defaultState.entities.teams,
                    myMembers: {
                        ...defaultState.entities.teams.myMembers,
                        [otherTeam.id]: {},
                    },
                },
                posts: {
                    ...defaultState.entities.posts,
                    posts: {
                        ...defaultState.entities.posts.posts,
                        [post.id]: {
                            ...defaultState.entities.posts.posts[post.id],
                            channel_id: dmChannel.id,
                        },
                    },
                },
            },
        };

        let newProps = mstp(state, defaultProps);
        expect(newProps.teamName).toBe('');

        state = {
            ...state,
            entities: {
                ...state.entities,
                channels: {
                    ...state.entities.channels,
                    channels: {
                        ...state.entities.channels.channels,
                        [dmChannel.id]: {
                            ...dmChannel,
                            type: General.GM_CHANNEL,
                        },
                    },
                },
            },
        };
        newProps = mstp(state, defaultProps);
        expect(newProps.teamName).toBe('');
    });
});
