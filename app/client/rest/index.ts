// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import ClientCalls, {type ClientCallsMix} from '@calls/client/rest';
import ClientPlugins, {type ClientPluginsMix} from '@client/rest/plugins';
import ClientPlaybooks, {type ClientPlaybooksMix} from '@playbooks/client/rest';
import mix from '@utils/mix';

import ClientApps, {type ClientAppsMix} from './apps';
import ClientBase from './base';
import ClientCategories, {type ClientCategoriesMix} from './categories';
import ClientChannelBookmarks, {type ClientChannelBookmarksMix} from './channel_bookmark';
import ClientChannels, {type ClientChannelsMix} from './channels';
import {DEFAULT_LIMIT_AFTER, DEFAULT_LIMIT_BEFORE, HEADER_X_VERSION_ID} from './constants';
import ClientCustomAttributes, {type ClientCustomAttributesMix} from './custom_profile_attributes';
import ClientEmojis, {type ClientEmojisMix} from './emojis';
import ClientFiles, {type ClientFilesMix} from './files';
import ClientGeneral, {type ClientGeneralMix} from './general';
import ClientGroups, {type ClientGroupsMix} from './groups';
import ClientIntegrations, {type ClientIntegrationsMix} from './integrations';
import ClientNPS, {type ClientNPSMix} from './nps';
import ClientPosts, {type ClientPostsMix} from './posts';
import ClientPreferences, {type ClientPreferencesMix} from './preferences';
import ClientScheduledPost, {type ClientScheduledPostMix} from './scheduled_post';
import ClientTeams, {type ClientTeamsMix} from './teams';
import ClientThreads, {type ClientThreadsMix} from './threads';
import ClientTos, {type ClientTosMix} from './tos';
import ClientUsers, {type ClientUsersMix} from './users';

import type {APIClientInterface} from '@mattermost/react-native-network-client';

interface Client extends ClientBase,
    ClientAppsMix,
    ClientCategoriesMix,
    ClientChannelsMix,
    ClientChannelBookmarksMix,
    ClientEmojisMix,
    ClientFilesMix,
    ClientGeneralMix,
    ClientGroupsMix,
    ClientIntegrationsMix,
    ClientPostsMix,
    ClientPreferencesMix,
    ClientScheduledPostMix,
    ClientTeamsMix,
    ClientThreadsMix,
    ClientTosMix,
    ClientUsersMix,
    ClientCallsMix,
    ClientPluginsMix,
    ClientNPSMix,
    ClientCustomAttributesMix,
    ClientPlaybooksMix
{}

class Client extends mix(ClientBase).with(
    ClientApps,
    ClientCategories,
    ClientChannels,
    ClientChannelBookmarks,
    ClientEmojis,
    ClientFiles,
    ClientGeneral,
    ClientGroups,
    ClientIntegrations,
    ClientPosts,
    ClientPreferences,
    ClientScheduledPost,
    ClientTeams,
    ClientThreads,
    ClientTos,
    ClientUsers,
    ClientCalls,
    ClientPlugins,
    ClientNPS,
    ClientCustomAttributes,
    ClientScheduledPost,
    ClientPlaybooks,
) {
    // eslint-disable-next-line no-useless-constructor
    constructor(apiClient: APIClientInterface, serverUrl: string, bearerToken?: string, csrfToken?: string, preauthSecret?: string) {
        super(apiClient, serverUrl, bearerToken, csrfToken, preauthSecret);
    }
}

export {Client, DEFAULT_LIMIT_AFTER, DEFAULT_LIMIT_BEFORE, HEADER_X_VERSION_ID};
