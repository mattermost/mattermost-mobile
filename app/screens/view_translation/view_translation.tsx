// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {ScrollView, Text, View} from 'react-native';
import {type Edge, SafeAreaView} from 'react-native-safe-area-context';

import Post from '@components/post_list/post';
import Tag from '@components/tag';
import {Screens} from '@constants';
import {ExtraKeyboardProvider} from '@context/extra_keyboard';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {popTopScreen} from '@screens/navigation';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import type PostModel from '@typings/database/models/servers/post';
import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    componentId: AvailableScreens;
    post: PostModel;
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
            padding: 20,
        },
        content: {
            gap: 16,
        },
        messageBlock: {
            backgroundColor: theme.centerChannelBg,
            padding: 16,
            borderRadius: 4,
        },
        messageBlockOriginal: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.04),
        },
        badgeContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 12,
            gap: 8,
        },
        languageText: {
            color: theme.centerChannelColor,
            textTransform: 'uppercase',
            ...typography('Heading', 50, 'SemiBold'),
        },
    };
});

function ViewTranslation({
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

    const originalLanguage = post.metadata?.original_language || 'en';

    const renderMessageBlock = (
        language: string,
        original: boolean,
    ) => {
        const badgeLabel = original ? intl.formatMessage({id: 'mobile.translation.original_badge', defaultMessage: 'ORIGINAL'}) : intl.formatMessage({id: 'mobile.translation.auto_translated_badge', defaultMessage: 'AUTO-TRANSLATED'});
        return (
            <View style={[style.messageBlock, original && style.messageBlockOriginal]}>
                <View style={style.badgeContainer}>
                    <Text style={style.languageText}>{intl.formatDisplayName(language, {type: 'language'})}</Text>
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
                    location={Screens.VIEW_TRANSLATION}
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
            testID='view_translation.screen'
        >
            <ExtraKeyboardProvider>
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
            </ExtraKeyboardProvider>
        </SafeAreaView>
    );
}

export default ViewTranslation;

