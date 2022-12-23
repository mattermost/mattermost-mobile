// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import ClientCalls, {ClientCallsMix} from '@calls/client/rest';
import ClientPlugins, {ClientPluginsMix} from '@client/rest/plugins';
import mix from '@utils/mix';

import ClientApps, {ClientAppsMix} from './apps';
import ClientBase from './base';
import ClientCategories, {ClientCategoriesMix} from './categories';
import ClientChannels, {ClientChannelsMix} from './channels';
import {DEFAULT_LIMIT_AFTER, DEFAULT_LIMIT_BEFORE, HEADER_X_VERSION_ID} from './constants';
import ClientEmojis, {ClientEmojisMix} from './emojis';
import ClientFiles, {ClientFilesMix} from './files';
import ClientGeneral, {ClientGeneralMix} from './general';
import ClientGroups, {ClientGroupsMix} from './groups';
import ClientIntegrations, {ClientIntegrationsMix} from './integrations';
import ClientNPS, {ClientNPSMix} from './nps';
import ClientPosts, {ClientPostsMix} from './posts';
import ClientPreferences, {ClientPreferencesMix} from './preferences';
import ClientTeams, {ClientTeamsMix} from './teams';
import ClientThreads, {ClientThreadsMix} from './threads';
import ClientTos, {ClientTosMix} from './tos';
import ClientUsers, {ClientUsersMix} from './users';

import type {APIClientInterface} from '@mattermost/react-native-network-client';

interface Client extends ClientBase,
    ClientAppsMix,
    ClientCategoriesMix,
    ClientChannelsMix,
    ClientEmojisMix,
    ClientFilesMix,
    ClientGeneralMix,
    ClientGroupsMix,
    ClientIntegrationsMix,
    ClientPostsMix,
    ClientPreferencesMix,
    ClientTeamsMix,
    ClientThreadsMix,
    ClientTosMix,
    ClientUsersMix,
    ClientCallsMix,
    ClientPluginsMix,
    ClientNPSMix
{}

class Client extends mix(ClientBase).with(
    ClientApps,
    ClientCategories,
    ClientChannels,
    ClientEmojis,
    ClientFiles,
    ClientGeneral,
    ClientGroups,
    ClientIntegrations,
    ClientPosts,
    ClientPreferences,
    ClientTeams,
    ClientThreads,
    ClientTos,
    ClientUsers,
    ClientCalls,
    ClientPlugins,
    ClientNPS,
) {
    // eslint-disable-next-line no-useless-constructor
    constructor(apiClient: APIClientInterface, serverUrl: string, bearerToken?: string, csrfToken?: string) {
        super(apiClient, serverUrl, bearerToken, csrfToken);
    }
}

export {Client, DEFAULT_LIMIT_AFTER, DEFAULT_LIMIT_BEFORE, HEADER_X_VERSION_ID};
