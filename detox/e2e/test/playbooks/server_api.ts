// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import fetch from 'node-fetch';

export const siteOneUrl = 'http://localhost:8065';

// Function to fetch CSRF token
async function fetchCsrfToken(siteUrl: string) {
    try {
        const response = await fetch(`${siteUrl}/api/v4/system/ping`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
        
        const cookies = response.headers.get('set-cookie');
        if (cookies) {
            const csrfMatch = cookies.match(/MMCSRF=([^;]+)/);
            if (csrfMatch && csrfMatch[1]) {
                csrfToken = csrfMatch[1];
                console.log('CSRF token acquired from ping:', csrfToken);
                return true;
            }
        }
        
        console.warn('Could not extract CSRF token from ping response');
        return false;
    } catch (error) {
        console.error('Error fetching CSRF token:', error);
        return false;
    }
}

async function doFetch(url: string, options: any = {}) {    
    console.log(`Making request to: ${url}`);
    console.log(`Method: ${options.method || 'GET'}`);
    
    // For Mattermost API, the token should be sent as a header
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };
    
    if (token && !url.includes('/api/v4/users/login')) {
        // Add Authorization header
        headers['Authorization'] = `Bearer ${token}`;
        
        // Add CSRF token for non-GET requests
        if (options.method && options.method !== 'GET' && csrfToken) {
            headers['X-CSRF-Token'] = csrfToken;
        }
        
        // Add cookies for authentication and CSRF
        const cookies = [`MMAUTHTOKEN=${token}`];
        if (csrfToken) {
            cookies.push(`MMCSRF=${csrfToken}`);
        }
        headers['Cookie'] = cookies.join('; ');
    }
    
    const response = await fetch(url, {
        ...options,
        headers: {
            ...headers,
            ...options.headers,
        },
    });

    if (!response.ok) {
        // Try to get more detailed error information
        let errorDetails = '';
        try {
            const errorJson = await response.json();
            errorDetails = JSON.stringify(errorJson);
        } catch (e) {
            try {
                // Try to get the text response if JSON parsing fails
                errorDetails = await response.text();
            } catch (textError) {
                // If we can't parse the response as text either, just use the status text
                errorDetails = response.statusText;
            }
        }
        
        throw new Error(`API request failed: ${response.status} ${response.statusText}\nURL: ${url}\nDetails: ${errorDetails}`);
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
        // Try different API endpoints for playbooks
        const endpoints = [
            // First try the v1 API
            `${siteUrl}/plugins/playbooks/api/v1/playbooks`,
            // Then try the v0 API
            `${siteUrl}/plugins/playbooks/api/v0/playbooks`,
            // Then try the team-specific endpoint
            `${siteUrl}/plugins/playbooks/api/v0/teams/${options.teamId}/playbooks`
        ];
        
        // Log the request for debugging
        console.log('Creating playbook with options:', JSON.stringify(options, null, 2));
        
        // Complete playbook structure based on API requirements
        const playbook = {
            title: options.title,
            team_id: options.teamId,
            description: 'Test playbook created via API',
            public: true,
            create_public_playbook_run: true,
            member_ids: [options.userId],
            checklists: [
                {
                    title: 'Test Checklist',
                    items: [
                        {
                            title: 'Test Checklist Item',
                            description: 'Test description',
                            state: 0,
                            command: '',
                            command_last_run: 0,
                        },
                    ],
                },
            ],
            message_on_join: 'Welcome to the playbook run!',
            retrospective_enabled: true,
            retrospective_reminder_interval_seconds: 86400,
            webhook_on_creation_urls: [],
            webhook_on_status_update_urls: [],
        };
        
        // Log the actual request payload
        console.log('Playbook request payload:', JSON.stringify(playbook, null, 2));

        // Try each endpoint in sequence
        let lastError = null;
        for (const url of endpoints) {
            try {
                console.log(`Trying endpoint: ${url}`);
                return await doFetch(url, {
                    method: 'POST',
                    body: JSON.stringify(playbook),
                });
            } catch (error) {
                console.error(`Error with endpoint ${url}:`, error);
                lastError = error;
                // Continue to the next endpoint
            }
        }
        
        // If we get here, all endpoints failed
        console.error('All playbook creation endpoints failed');
        
        // As a last resort, try creating a minimal playbook
        const minimalPlaybook = {
            title: options.title,
            team_id: options.teamId,
            checklists: [{title: 'Checklist', items: []}],
        };
        
        console.log('Trying with minimal playbook payload:', JSON.stringify(minimalPlaybook, null, 2));
        
        try {
            // Make sure we have a valid endpoint
            const endpoint = endpoints[0];
            if (!endpoint) {
                throw new Error('No valid endpoint found for playbook creation');
            }
            
            return await doFetch(endpoint, {
                method: 'POST',
                body: JSON.stringify(minimalPlaybook),
            });
        } catch (finalError) {
            console.error('Final attempt failed:', finalError);
            throw lastError || finalError;
        }
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

// Store authentication tokens
let token = '';
let csrfToken = '';

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
        
        // Extract CSRF token from headers or cookies
        const cookies = response.headers.get('set-cookie');
        if (cookies) {
            const csrfMatch = cookies.match(/MMCSRF=([^;]+)/);
            if (csrfMatch && csrfMatch[1]) {
                csrfToken = csrfMatch[1];
                console.log('CSRF token acquired:', csrfToken);
            }
        }
        
        // If token is not in the Token header, try to get it from the response body
        if (!token) {
            const data = await response.json();
            if (data && data.token) {
                token = data.token;
            }
        }
        
        if (!token) {
            console.warn('Warning: No authentication token found in response');
        } else {
            console.log('Authentication successful, token acquired');
        }
        
        // If we still don't have a CSRF token, make a request to get one
        if (!csrfToken) {
            console.log('No CSRF token found in login response, fetching from API...');
            await fetchCsrfToken(siteUrl);
        }
        
        // Print all headers for debugging
        console.log('Response headers:');
        response.headers.forEach((value, name) => {
            console.log(`${name}: ${value}`);
        });
        
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
