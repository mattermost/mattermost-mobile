// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {typography} from '@app/utils/typography';
import CompassIcon from '@components/compass_icon';
import {General, Screens} from '@constants';
import DatabaseManager from '@database/manager';
import {getTranslations, t} from '@i18n';
import {queryChannelById} from '@queries/servers/channel';
import {queryPostById} from '@queries/servers/post';
import {queryCurrentUser} from '@queries/servers/user';
import {showModal} from '@screens/navigation';
import {CLOSE_BUTTON_ID} from '@screens/thread/thread';
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
            return {error: 'User not found'};
        }

        const post = await queryPostById(database, rootId);
        if (!post) {
            return {error: 'Post not found'};
        }
        const channel = await queryChannelById(database, post.channelId);
        if (!channel) {
            return {error: 'Channel not found'};
        }

        const theme = EphemeralStore.theme;
        if (!theme) {
            return {error: 'Theme not found'};
        }

        // Get translation by user locale
        const translations = getTranslations(user.locale);

        // Get title translation or default title message
        let title = translations[t('thread.header.thread')] || 'Thread';
        if (channel.type === General.DM_CHANNEL) {
            title = translations[t('thread.header.thread_dm')] || 'Direct Message Thread';
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
                    ...typography('Heading', 300, 'SemiBold'),
                    text: title,
                },
                subtitle: {
                    color: changeOpacity(theme.sidebarHeaderTextColor, 0.72),
                    text: subtitle,
                },
                leftButtons: [{
                    id: CLOSE_BUTTON_ID,
                    icon: CompassIcon.getImageSourceSync('close', 24, theme.centerChannelColor),
                    testID: CLOSE_BUTTON_ID,
                }],
            },
        });
        return {};
    } catch (error) {
        return {error};
    }
};
