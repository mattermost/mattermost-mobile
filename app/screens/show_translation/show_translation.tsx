// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {ScrollView, Text, View} from 'react-native';
import {type Edge, SafeAreaView} from 'react-native-safe-area-context';

import Post from '@components/post_list/post';
import Tag from '@components/tag';
import {Screens} from '@constants';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {popTopScreen} from '@screens/navigation';
import {getPostTranslation} from '@utils/post';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import type PostModel from '@typings/database/models/servers/post';
import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    componentId: AvailableScreens;
    post?: PostModel;
    appsEnabled: boolean;
    customEmojiNames: string[];
    isCRTEnabled: boolean;
}

const edges: Edge[] = ['bottom', 'left', 'right'];

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            flex: 1,
            backgroundColor: theme.centerChannelBg,
            padding: 8,
        },
        content: {
            gap: 8,
        },
        messageBlock: {
            backgroundColor: theme.centerChannelBg,
        },
        messageBlockOriginal: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.04),
            borderRadius: 4,
            paddingBottom: 8,
        },
        badgeContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            margin: 12,
            gap: 8,
        },
        languageText: {
            color: theme.centerChannelColor,
            textTransform: 'uppercase',
            ...typography('Heading', 50, 'SemiBold'),
        },
    };
});

function ShowTranslation({
    componentId,
    post,
    appsEnabled,
    customEmojiNames,
    isCRTEnabled,
}: Props) {
    const theme = useTheme();
    const intl = useIntl();
    const style = getStyleSheet(theme);

    const close = useCallback(() => {
        if (componentId) {
            popTopScreen(componentId);
        }
    }, [componentId]);

    useAndroidHardwareBackHandler(componentId, close);

    if (!post) {
        return null;
    }

    const translation = getPostTranslation(post, intl.locale);
    const originalLanguage = translation?.source_lang || 'unknown';

    const renderMessageBlock = (
        language: string,
        original: boolean,
    ) => {
        const badgeLabel = original ? intl.formatMessage({id: 'mobile.translation.original_badge', defaultMessage: 'ORIGINAL'}) : intl.formatMessage({id: 'mobile.translation.auto_translated_badge', defaultMessage: 'AUTO-TRANSLATED'});
        return (
            <View style={[style.messageBlock, original && style.messageBlockOriginal]}>
                <View style={style.badgeContainer}>
                    <Text style={style.languageText}>{language === 'unknown' ? intl.formatMessage({id: 'mobile.translation.unknown_language', defaultMessage: 'Unknown'}) : intl.formatDisplayName(language, {type: 'language'})}</Text>
                    <Tag
                        message={badgeLabel}
                        type={original ? 'info' : 'general'}
                        size='s'
                    />
                </View>
                <Post
                    appsEnabled={appsEnabled}
                    customEmojiNames={customEmojiNames}
                    highlightPinnedOrSaved={false}
                    isCRTEnabled={isCRTEnabled}
                    location={Screens.SHOW_TRANSLATION}
                    post={post}
                    shouldRenderReplyButton={false}
                    showAddReaction={false}
                    isChannelAutotranslated={!original}
                    nextPost={undefined}
                    previousPost={undefined}
                    skipSavedHeader={true}
                    skipPinnedHeader={true}
                />
            </View>
        );
    };

    return (
        <SafeAreaView
            edges={edges}
            style={style.container}
            testID='show_translation.screen'
        >
            <ScrollView
                contentContainerStyle={style.content}
                showsVerticalScrollIndicator={true}
            >
                {renderMessageBlock(
                    originalLanguage,
                    true,
                )}
                {renderMessageBlock(
                    intl.locale,
                    false,
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

export default ShowTranslation;

