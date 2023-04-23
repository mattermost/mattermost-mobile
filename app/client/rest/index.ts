// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import ClientCalls, {type ClientCallsMix} from '@calls/client/rest';
import ClientPlugins, {type ClientPluginsMix} from '@client/rest/plugins';
import mix from '@utils/mix';

import ClientApps, {type ClientAppsMix} from './apps';
import ClientBase from './base';
import ClientCategories, {type ClientCategoriesMix} from './categories';
import ClientChannels, {type ClientChannelsMix} from './channels';
import {DEFAULT_LIMIT_AFTER, DEFAULT_LIMIT_BEFORE, HEADER_X_VERSION_ID} from './constants';
import ClientEmojis, {type ClientEmojisMix} from './emojis';
import ClientFiles, {type ClientFilesMix} from './files';
import ClientGeneral, {type ClientGeneralMix} from './general';
import ClientGroups, {type ClientGroupsMix} from './groups';
import ClientIntegrations, {type ClientIntegrationsMix} from './integrations';
import ClientNPS, {type ClientNPSMix} from './nps';
import ClientPosts, {type ClientPostsMix} from './posts';
import ClientPreferences, {type ClientPreferencesMix} from './preferences';
import ClientTeams, {type ClientTeamsMix} from './teams';
import ClientThreads, {type ClientThreadsMix} from './threads';
import ClientTos, {type ClientTosMix} from './tos';
import ClientUsers, {type ClientUsersMix} from './users';

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
