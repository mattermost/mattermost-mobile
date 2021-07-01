// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import mix from '@utils/mix';

import {DEFAULT_LIMIT_AFTER, DEFAULT_LIMIT_BEFORE, HEADER_X_VERSION_ID} from './constants';
import ClientApps, {ClientAppsMix} from './apps';
import ClientBase from './base';
import ClientChannels, {ClientChannelsMix} from './channels';
import ClientEmojis, {ClientEmojisMix} from './emojis';
import ClientFiles, {ClientFilesMix} from './files';
import ClientGeneral, {ClientGeneralMix} from './general';
import ClientGroups, {ClientGroupsMix} from './groups';
import ClientIntegrations, {ClientIntegrationsMix} from './integrations';
import ClientPosts, {ClientPostsMix} from './posts';
import ClientPreferences, {ClientPreferencesMix} from './preferences';
import ClientTeams, {ClientTeamsMix} from './teams';
import ClientTos, {ClientTosMix} from './tos';
import ClientUsers, {ClientUsersMix} from './users';

import type {APIClientInterface} from '@mattermost/react-native-network-client';

interface Client extends ClientBase,
    ClientAppsMix,
    ClientChannelsMix,
    ClientEmojisMix,
    ClientFilesMix,
    ClientGeneralMix,
    ClientGroupsMix,
    ClientIntegrationsMix,
    ClientPostsMix,
    ClientPreferencesMix,
    ClientTeamsMix,
    ClientTosMix,
    ClientUsersMix
{}

class Client extends mix(ClientBase).with(
    ClientApps,
    ClientChannels,
    ClientEmojis,
    ClientFiles,
    ClientGeneral,
    ClientGroups,
    ClientIntegrations,
    ClientPosts,
    ClientPreferences,
    ClientTeams,
    ClientTos,
    ClientUsers,
) {
    // eslint-disable-next-line no-useless-constructor
    constructor(apiClient: APIClientInterface, serverUrl: string, bearerToken?: string, csrfToken?: string) {
        super(apiClient, serverUrl, bearerToken, csrfToken);
    }
}

export {Client, DEFAULT_LIMIT_AFTER, DEFAULT_LIMIT_BEFORE, HEADER_X_VERSION_ID};
