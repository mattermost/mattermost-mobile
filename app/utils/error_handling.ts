// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database, Q} from '@nozbe/watermelondb';
import {Alert} from 'react-native';
import {
    setJSExceptionHandler,

    // setNativeExceptionHandler
} from 'react-native-exception-handler';

import {MM_TABLES} from '@constants/database';
import DatabaseManager from '@database/manager';
import {subscribeActiveServers} from '@database/subscription/servers';
import {DEFAULT_LOCALE, getTranslations, t} from '@i18n';
import {getCurrentChannel} from '@queries/servers/channel';
import {getConfig, getCurrentTeamId} from '@queries/servers/system';
import {getCurrentUser} from '@queries/servers/user';
import {dismissAllModals} from '@screens/navigation';
import ServersModel from '@typings/database/models/app/servers';
import MyChannelModel from '@typings/database/models/servers/my_channel';
import MyTeamModel from '@typings/database/models/servers/my_team';
import {ClientError} from '@utils/client_error';
import {captureException, captureJSException, initializeSentry, LOGGER_NATIVE} from '@utils/sentry';

import {logWarning} from './log';

class JavascriptAndNativeErrorHandler {
    private activeServerDatabase: Database | undefined;

    private errorContext: any;

    initializeErrorHandling = () => {
        initializeSentry();
        this.enrichSentry();
        setJSExceptionHandler(this.errorHandler, false);

        // setNativeExceptionHandler(this.nativeErrorHandler, false);
    };
    enrichSentry = () => {
        subscribeActiveServers((servers: ServersModel[]) => {
            const server = servers?.length ? servers.reduce((a, b) => (b.lastActiveAt > a.lastActiveAt ? b : a)) : undefined;

            if (server) {
                const database = DatabaseManager.serverDatabases[server.url]?.database;

                if (database) {
                    this.activeServerDatabase = database;
                    this.errorContext = {
                        ...this.getBuildTags(),
                        ...this.getExtraContext(),
                        ...this.getServerContext(),
                        ...this.getUserContext(),
                    };
                }
            } else {
                this.activeServerDatabase = undefined;
            }
        });
    };

    nativeErrorHandler = (e: string) => {
        logWarning('Handling native error ' + e);
        captureException(e, {logger: LOGGER_NATIVE, ...this.errorContext});
    };

    errorHandler = (e: Error | ClientError, isFatal: boolean) => {
        if (__DEV__ && !e && !isFatal) {
            // react-native-exception-handler redirects console.error to call this, and React calls
            // console.error without an exception when prop type validation fails, so this ends up
            // being called with no arguments when the error handler is enabled in dev mode.
            return;
        }

        logWarning('Handling Javascript error', e, isFatal);

        captureJSException(e, isFatal, {logger: LOGGER_NATIVE, ...this.errorContext});

        if (isFatal && e instanceof Error) {
            const translations = getTranslations(DEFAULT_LOCALE);

            Alert.alert(
                translations[t('mobile.error_handler.title')],
                translations[t('mobile.error_handler.description')] + `\n\n${e.message}\n\n${e.stack}`,
                [{
                    text: translations[t('mobile.error_handler.button')],
                    onPress: async () => {
                        await dismissAllModals();
                    },
                }],
                {cancelable: false},
            );
        }
    };

    getUserContext = async () => {
        const currentUser = {
            id: 'currentUserId',
            locale: 'en',
            roles: 'multi-server-test-role',
        };

        if (this.activeServerDatabase) {
            const user = await getCurrentUser(this.activeServerDatabase);
            if (user) {
                currentUser.id = user.id;
                currentUser.locale = user.locale;
                currentUser.roles = user.roles;
            }
        }

        return {
            userID: currentUser.id,
            email: '',
            username: '',
            extra: {
                locale: currentUser.locale,
                roles: currentUser.roles,
            },
        };
    };

    getExtraContext = async () => {
        const context = {
            config: {},
            currentChannel: {},
            currentChannelMember: {},
            currentTeam: {},
            currentTeamMember: {},
        };

        const extraContext = await this.getServerContext();
        if (extraContext) {
            context.config = {
                BuildDate: extraContext.config?.BuildDate,
                BuildEnterpriseReady: extraContext.config?.BuildEnterpriseReady,
                BuildHash: extraContext.config?.BuildHash,
                BuildHashEnterprise: extraContext.config?.BuildHashEnterprise,
                BuildNumber: extraContext.config?.BuildNumber,
            };
            context.currentChannel = {
                id: extraContext.channel?.id,
                type: extraContext.channel?.type,
            };
            context.currentChannelMember = {
                roles: extraContext.channelRoles,
            };
            context.currentTeam = {
                id: extraContext.teamId,
            };
            context.currentTeamMember = {
                roles: extraContext.teamRoles,
            };
        }

        return context;
    };

    getBuildTags = async () => {
        let tags;
        if (this.activeServerDatabase) {
            const config = await getConfig(this.activeServerDatabase);
            if (config) {
                tags = {
                    serverBuildHash: config.BuildHash,
                    serverBuildNumber: config.BuildNumber,
                };
            }
        }

        return tags;
    };

    getServerContext = async () => {
        const db = this.activeServerDatabase;
        if (db) {
            const config = await getConfig(db);
            const currentTeamId = await getCurrentTeamId(db);

            const myTeam = await db.get<MyTeamModel>(MM_TABLES.SERVER.MY_TEAM).query(Q.where('id', currentTeamId)).fetch();
            const teamRoles = myTeam?.[0]?.roles;

            const channel = await getCurrentChannel(db);
            let channelRoles;
            if (channel) {
                const myChannel = await db.get<MyChannelModel>(MM_TABLES.SERVER.MY_CHANNEL).query(Q.where('id', channel.id)).fetch();
                channelRoles = myChannel?.[0]?.roles;
            }

            return {
                channel,
                channelRoles,
                config,
                teamId: currentTeamId,
                teamRoles,
            };
        }
        return null;
    };
}

export default new JavascriptAndNativeErrorHandler();
