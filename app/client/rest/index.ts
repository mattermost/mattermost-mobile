// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import mix from '@utils/mix';

import ClientApps, {ClientAppsMix} from './apps';
import ClientBase from './base';
import ClientBots, {ClientBotsMix} from './bots';
import ClientChannels, {ClientChannelsMix} from './channels';
import {DEFAULT_LIMIT_AFTER, DEFAULT_LIMIT_BEFORE, HEADER_X_VERSION_ID} from './constants';
import ClientEmojis, {ClientEmojisMix} from './emojis';
import ClientFiles, {ClientFilesMix} from './files';
import ClientGeneral, {ClientGeneralMix} from './general';
import ClientGroups, {ClientGroupsMix} from './groups';
import ClientIntegrations, {ClientIntegrationsMix} from './integrations';
import ClientPosts, {ClientPostsMix} from './posts';
import ClientPreferences, {ClientPreferencesMix} from './preferences';
import ClientSharedChannels, {ClientSharedChannelsMix} from './shared_channels';
import ClientTeams, {ClientTeamsMix} from './teams';
import ClientTos, {ClientTosMix} from './tos';
import ClientUsers, {ClientUsersMix} from './users';
import ClientVoiceCalls, {ClientVoiceCallsMix} from './voiceCalls';

interface Client extends ClientBase,
    ClientAppsMix,
    ClientBotsMix,
    ClientChannelsMix,
    ClientEmojisMix,
    ClientFilesMix,
    ClientGeneralMix,
    ClientGroupsMix,
    ClientIntegrationsMix,
    ClientPostsMix,
    ClientPreferencesMix,
    ClientSharedChannelsMix,
    ClientTeamsMix,
    ClientTosMix,
    ClientUsersMix,
    ClientVoiceCallsMix
{}

class Client extends mix(ClientBase).with(
    ClientApps,
    ClientBots,
    ClientChannels,
    ClientEmojis,
    ClientFiles,
    ClientGeneral,
    ClientGroups,
    ClientIntegrations,
    ClientPosts,
    ClientPreferences,
    ClientSharedChannels,
    ClientTeams,
    ClientTos,
    ClientUsers,
    ClientVoiceCalls,
) {}

const Client4 = new Client();

export {Client4, Client, DEFAULT_LIMIT_AFTER, DEFAULT_LIMIT_BEFORE, HEADER_X_VERSION_ID};
