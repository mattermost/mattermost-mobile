// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Dimensions} from 'react-native';
import DeviceInfo from 'react-native-device-info';

import LocalConfig from '@assets/config.json';
import {isTablet} from '@utils/helpers';
import {isSystemAdmin} from '@utils/user';

const clientMap: Record<string, Analytics> = {};

export class Analytics {
    analytics: RudderClient | null = null;
    context: any;
    diagnosticId: string | undefined;

    userRoles: string | null = null;
    userId = '';
    tracker: Record<string, number> = {
        initialLoad: 0,
        channelSwitch: 0,
        teamSwitch: 0,
    };

    async init(config: ClientConfig) {
        if (LocalConfig.RudderApiKey) {
            // Rudder stack has been temporarily removed
            // this.analytics = require('@rudderstack/rudder-sdk-react-native').default;
        }

        if (this.analytics) {
            const {height, width} = Dimensions.get('window');
            this.diagnosticId = config.DiagnosticId;

            if (this.diagnosticId) {
                await this.analytics.setup(LocalConfig.RudderApiKey, {
                    dataPlaneUrl: 'https://pdat.matterlytics.com',
                    recordScreenViews: true,
                    flushQueueSize: 20,
                });

                this.context = {
                    app: {
                        version: DeviceInfo.getVersion(),
                        build: DeviceInfo.getBuildNumber(),
                    },
                    device: {
                        dimensions: {
                            height,
                            width,
                        },
                        isTablet: isTablet(),
                        os: DeviceInfo.getSystemVersion(),
                    },
                    ip: '0.0.0.0',
                    server: config.Version,
                };

                this.analytics.identify(
                    this.diagnosticId,
                    this.context,
                );
            } else {
                this.analytics.reset();
            }
        }

        return this.analytics;
    }

    async reset() {
        this.userId = '';
        this.userRoles = null;
        if (this.analytics) {
            await this.analytics.reset();
        }
    }

    setUserId(userId: string) {
        this.userId = userId;
    }

    setUserRoles(roles: string) {
        this.userRoles = roles;
    }

    trackEvent(category: string, event: string, props?: any) {
        if (!this.analytics) {
            return;
        }

        const properties = Object.assign({
            category,
            type: event,
            user_actual_role: this.userRoles && isSystemAdmin(this.userRoles) ? 'system_admin, system_user' : 'system_user',
            user_actual_id: this.userId,
        }, props);
        const options = {
            context: this.context,
            anonymousId: '00000000000000000000000000',
        };

        this.analytics.track(event, properties, options);
    }

    recordTime(screenName: string, category: string, userId: string) {
        if (this.analytics) {
            const startTime: number = this.tracker[category];
            this.tracker[category] = 0;
            this.analytics.screen(
                screenName, {
                    userId: this.diagnosticId,
                    context: this.context,
                    properties: {
                        user_actual_id: userId,
                        time: Date.now() - startTime,
                    },
                },
            );
        }
    }

    trackAPI(event: string, props?: any) {
        if (!this.analytics) {
            return;
        }

        this.trackEvent('api', event, props);
    }

    trackCommand(event: string, command: string, errorMessage?: string) {
        if (!this.analytics) {
            return;
        }

        const sanitizedCommand = this.sanitizeCommand(command);
        let props: any;
        if (errorMessage) {
            props = {command: sanitizedCommand, error: errorMessage};
        } else {
            props = {command: sanitizedCommand};
        }

        this.trackEvent('command', event, props);
    }

    trackAction(event: string, props?: any) {
        if (!this.analytics) {
            return;
        }
        this.trackEvent('action', event, props);
    }

    sanitizeCommand(userInput: string): string {
        const commandList = ['agenda', 'autolink', 'away', 'bot-server', 'code', 'collapse',
            'dnd', 'echo', 'expand', 'export', 'giphy', 'github', 'groupmsg', 'header', 'help',
            'invite', 'invite_people', 'jira', 'jitsi', 'join', 'kick', 'leave', 'logout', 'me',
            'msg', 'mute', 'nc', 'offline', 'online', 'open', 'poll', 'poll2', 'post-mortem',
            'purpose', 'recommend', 'remove', 'rename', 'search', 'settings', 'shortcuts',
            'shrug', 'standup', 'todo', 'wrangler', 'zoom'];
        const index = userInput.indexOf(' ');
        if (index === -1) {
            return userInput[0];
        }
        const command = userInput.substring(1, index);
        if (commandList.includes(command)) {
            return command;
        }
        return 'custom_command';
    }
}

export function create(serverUrl: string): Analytics {
    let client = clientMap[serverUrl];

    if (client) {
        return client;
    }

    client = new Analytics();
    clientMap[serverUrl] = client;
    return client;
}

export function get(serverUrl: string): Analytics | undefined {
    return clientMap[serverUrl];
}

export function invalidate(serverUrl: string) {
    delete clientMap[serverUrl];
}

export default {
    create,
    get,
    invalidate,
};
