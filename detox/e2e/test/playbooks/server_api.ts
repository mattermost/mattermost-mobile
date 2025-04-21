// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import fetch from 'node-fetch';

export const siteOneUrl = 'http://localhost:8065';

// Helper function for API requests
async function doFetch(url: string, options: any = {}) {
    // Store token from login response
    static let token = '';
    
    const response = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token && url !== `${siteOneUrl}/api/v4/users/login` ? { 'Authorization': `Bearer ${token}` } : {}),
            ...options.headers,
        },
    });

    if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    // If this is a login response, save the token
    if (url.includes('/api/v4/users/login')) {
        token = response.headers.get('Token') || '';
        console.log('Authentication successful, token acquired');
    }

    return response.json();
}

export class Playbooks {
    static async apiCreateTestPlaybook(siteUrl: string, options: any) {
        const url = `${siteUrl}/plugins/playbooks/api/v0/playbooks`;
        const playbook = {
            title: options.title,
            team_id: options.teamId,
            description: 'Test playbook created via API',
            public: true,
            checklists: [
                {
                    title: 'Test Checklist',
                    items: [
                        {
                            title: 'Test Checklist Item',
                            description: 'Test description',
                            state: 0,
                        },
                    ],
                },
            ],
            members: [
                {
                    user_id: options.userId,
                    roles: ['playbook_admin'],
                },
            ],
        };

        return doFetch(url, {
            method: 'POST',
            body: JSON.stringify(playbook),
        });
    }

    static async apiGetPlaybook(siteUrl: string, playbookId: string) {
        const url = `${siteUrl}/plugins/playbooks/api/v0/playbooks/${playbookId}`;
        return doFetch(url);
    }

    static async apiArchivePlaybook(siteUrl: string, playbookId: string) {
        const url = `${siteUrl}/plugins/playbooks/api/v0/playbooks/${playbookId}`;
        return doFetch(url, { method: 'DELETE' });
    }

    static async apiRunPlaybook(siteUrl: string, options: any) {
        const url = `${siteUrl}/plugins/playbooks/api/v0/runs`;
        const run = {
            name: options.name,
            owner_user_id: options.owner_user_id,
            team_id: options.team_id,
            playbook_id: options.playbook_id,
            channel_id: options.channel_id,
        };

        return doFetch(url, {
            method: 'POST',
            body: JSON.stringify(run),
        });
    }

    static async apiGetPlaybookRun(siteUrl: string, runId: string) {
        const url = `${siteUrl}/plugins/playbooks/api/v0/runs/${runId}`;
        return doFetch(url);
    }

    static async apiUpdateStatus(siteUrl: string, runId: string, message: string) {
        const url = `${siteUrl}/plugins/playbooks/api/v0/runs/${runId}/status`;
        return doFetch(url, {
            method: 'POST',
            body: JSON.stringify({ message }),
        });
    }

    static async apiFinishRun(siteUrl: string, runId: string) {
        const url = `${siteUrl}/plugins/playbooks/api/v0/runs/${runId}/finish`;
        return doFetch(url, { method: 'PUT' });
    }

    static async apiFollowPlaybookRun(siteUrl: string, runId: string) {
        const url = `${siteUrl}/plugins/playbooks/api/v0/runs/${runId}/followers`;
        return doFetch(url, { method: 'PUT' });
    }

    static async apiUnfollowPlaybookRun(siteUrl: string, runId: string) {
        const url = `${siteUrl}/plugins/playbooks/api/v0/runs/${runId}/followers`;
        return doFetch(url, { method: 'DELETE' });
    }

    static async apiUpdatePlaybook(siteUrl: string, playbook: any) {
        const url = `${siteUrl}/plugins/playbooks/api/v0/playbooks/${playbook.id}`;
        return doFetch(url, {
            method: 'PUT',
            body: JSON.stringify(playbook),
        });
    }
}

export class Team {
    static async apiCreateTeam(siteUrl: string) {
        const url = `${siteUrl}/api/v4/teams`;
        const team = {
            name: 'team' + Date.now(),
            display_name: 'Team ' + Date.now(),
            type: 'O',
        };

        return {
            team: await doFetch(url, {
                method: 'POST',
                body: JSON.stringify(team),
            }),
        };
    }

    static async apiAddUserToTeam(siteUrl: string, userId: string, teamId: string) {
        const url = `${siteUrl}/api/v4/teams/${teamId}/members`;
        return doFetch(url, {
            method: 'POST',
            body: JSON.stringify({ team_id: teamId, user_id: userId }),
        });
    }

    static async apiDeleteTeam(siteUrl: string, teamId: string) {
        const url = `${siteUrl}/api/v4/teams/${teamId}`;
        return doFetch(url, { method: 'DELETE' });
    }
}

// Store token from login response
let token = '';

export class User {
    static async apiAdminLogin(siteUrl: string) {
        const url = `${siteUrl}/api/v4/users/login`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                login_id: 'sysadmin',
                password: 'Sys@dmin-sample1',
            }),
        });

        if (!response.ok) {
            throw new Error(`Login failed: ${response.status} ${response.statusText}`);
        }

        // Extract token from headers
        token = response.headers.get('Token') || '';
        console.log('Authentication successful, token acquired');
        
        return response.json();
    }

    static async apiCreateUser(siteUrl: string) {
        const url = `${siteUrl}/api/v4/users`;
        const timestamp = Date.now();
        const user = {
            email: `user${timestamp}@example.com`,
            username: `user${timestamp}`,
            password: 'Password1',
            first_name: 'Test',
            last_name: 'User',
        };

        return {
            user: await doFetch(url, {
                method: 'POST',
                body: JSON.stringify(user),
            }),
        };
    }

    static async apiDeactivateUser(siteUrl: string, userId: string) {
        const url = `${siteUrl}/api/v4/users/${userId}/active`;
        return doFetch(url, {
            method: 'PUT',
            body: JSON.stringify({ active: false }),
        });
    }
}

export class Channel {
    static async apiCreateChannel(siteUrl: string, options: any) {
        const url = `${siteUrl}/api/v4/channels`;
        const timestamp = Date.now();
        const channel = {
            team_id: options.teamId,
            name: (options.prefix || 'channel') + timestamp,
            display_name: 'Channel ' + timestamp,
            type: options.type || 'O',
        };

        return {
            channel: await doFetch(url, {
                method: 'POST',
                body: JSON.stringify(channel),
            }),
        };
    }

    static async apiDeleteChannel(siteUrl: string, channelId: string) {
        const url = `${siteUrl}/api/v4/channels/${channelId}`;
        return doFetch(url, { method: 'DELETE' });
    }
}
