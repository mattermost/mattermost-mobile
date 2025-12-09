// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useEffect} from 'react';
import {useIntl} from 'react-intl';

import {setMyChannelAutotranslation} from '@actions/remote/channel';
import {Screens} from '@constants';
import {useServerUrl} from '@context/server';
import EphemeralStore from '@store/ephemeral_store';
import {showEnableTranslationSnackbar} from '@utils/snack_bar';

import type PostModel from '@typings/database/models/servers/post';
import type {AvailableScreens} from '@typings/screens/navigation';

type UseTranslationPromptProps = {
    channelId: string;
    channelAutotranslationEnabled: boolean;
    isChannelAutotranslated: boolean;
    posts: PostModel[];
    location?: AvailableScreens;
};

export const useTranslationPrompt = ({
    channelId,
    channelAutotranslationEnabled,
    isChannelAutotranslated,
    posts,
    location,
}: UseTranslationPromptProps) => {
    const serverUrl = useServerUrl();
    const intl = useIntl();
    const userLocale = intl.locale;

    useEffect(() => {
        const enabled = location === Screens.CHANNEL || location === Screens.THREAD;
        const shown = EphemeralStore.hasShownTranslationToast(serverUrl, channelId);

        // Conditions for showing the toast:
        // 1. Hook is enabled (location is channel or thread)
        // 2. Channel has autotranslation enabled
        // 3. User does NOT have autotranslation enabled (isChannelAutotranslated is false)
        // 4. We haven't shown the toast for this channel yet (checked via EphemeralStore)
        // 5. There are posts to check
        if (!enabled || !channelAutotranslationEnabled || isChannelAutotranslated || shown || !posts.length) {
            return;
        }

        // Check if any post has a different language than user's locale
        const hasDifferentLanguage = posts.some((post: PostModel) => {
            const postLanguage = post.metadata?.original_language;
            if (!postLanguage) {
                return false;
            }

            // Normalize locales (e.g., 'en-US' -> 'en', 'es-ES' -> 'es')
            const normalizeLocale = (locale: string) => locale.split('-')[0].toLowerCase();
            const normalizedUserLocale = normalizeLocale(userLocale);
            const normalizedPostLocale = normalizeLocale(postLanguage);

            return normalizedPostLocale !== normalizedUserLocale;
        });

        if (hasDifferentLanguage) {
            EphemeralStore.setTranslationToastShown(serverUrl, channelId);
            showEnableTranslationSnackbar(() => {
                setMyChannelAutotranslation(serverUrl, channelId, true);
            }, location);
        }
    }, [channelId, channelAutotranslationEnabled, isChannelAutotranslated, posts, serverUrl, userLocale, location]);
};

