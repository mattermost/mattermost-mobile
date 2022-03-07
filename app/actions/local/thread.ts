// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {General} from '@constants';
import * as Screens from '@constants/screens';
import DatabaseManager from '@database/manager';
import {getTranslations, t} from '@i18n';
import {queryChannelById} from '@queries/servers/channel';
import {queryPostById} from '@queries/servers/post';
import {queryCurrentUser} from '@queries/servers/user';
import {showModal} from '@screens/navigation';
import EphemeralStore from '@store/ephemeral_store';
import {changeOpacity} from '@utils/theme';

export const switchToThread = async (serverUrl: string, rootId: string) => {
    const database = DatabaseManager.serverDatabases[serverUrl]?.database;
    if (!database) {
        return {error: `${serverUrl} database not found`};
    }

    try {
        const user = await queryCurrentUser(database);
        if (!user) {
            return {error: true};
        }

        const post = await queryPostById(database, rootId);
        if (!post) {
            return {error: true};
        }
        const channel = await queryChannelById(database, post.channelId);
        if (!channel) {
            return {error: true};
        }

        const theme = EphemeralStore.theme;
        if (!theme) {
            return {error: true};
        }

        // Get translation by user locale
        const translations = getTranslations(user.locale);

        // Get title translation or default title message
        let title;
        if (channel.type === General.DM_CHANNEL) {
            title = translations[t('thread.header.thread_dm')] || 'Direct Message Thread';
        } else {
            title = translations[t('thread.header.thread')] || 'Thread';
        }

        let subtitle = '';
        if (channel?.type !== General.DM_CHANNEL) {
            // Get translation or default message
            subtitle = translations[t('thread.header.thread_in')] || 'in {channelName}';
            subtitle = subtitle.replace('{channelName}', channel.displayName);
        }

        showModal(Screens.THREAD, '', {rootId}, {
            topBar: {
                title: {
                    fontFamily: 'OpenSans-SemiBold',
                    fontSize: 18,
                    text: title,
                },
                subtitle: {
                    color: changeOpacity(theme.sidebarHeaderTextColor, 0.72),
                    text: subtitle,
                },
            },
        });
        return {};
    } catch (error) {
        return {error};
    }
};
