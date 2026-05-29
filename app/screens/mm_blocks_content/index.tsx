// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useState} from 'react';
import {useIntl} from 'react-intl';
import {ScrollView, Text, View, type LayoutChangeEvent} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {MmBlocksContextProvider, type MmBlocksExpandedContentPayload} from '@components/block_renderer/mm_blocks_context_provider';
import {Screens} from '@constants';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {navigateBack} from '@screens/navigation';
import CallbackStore from '@store/callback_store';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        flex: 1,
    },
    fullHeight: {
        height: '100%',
    },
    scrollContent: {
        paddingHorizontal: 12,
    },
    noContentText: {
        color: theme.dndIndicator,
        ...typography('Body', 200, 'Regular'),
    },
    noContentContainer: {
        padding: 24,
    },
}));

const MmBlocksContent = () => {
    const payload = CallbackStore.getCallback<MmBlocksExpandedContentPayload>();
    const intl = useIntl();
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const [layoutWidth, setLayoutWidth] = useState<number | undefined>(undefined);

    const handleLayout = useCallback((event: LayoutChangeEvent) => {
        const width = Math.round(event.nativeEvent.layout.width);
        if (width > 0) {
            setLayoutWidth(width);
        }
    }, []);

    useEffect(() => {
        return () => {
            CallbackStore.removeCallback();
        };
    }, []);

    useAndroidHardwareBackHandler(Screens.MM_BLOCKS_CONTENT, navigateBack);

    if (!payload) {
        return (
            <View style={styles.noContentContainer}>
                <Text style={styles.noContentText}>
                    {intl.formatMessage({
                        id: 'mm_blocks_content.cannot_display',
                        defaultMessage: 'Cannot display content',
                    })}
                </Text>
            </View>
        );
    }

    return (
        <SafeAreaView
            style={styles.container}
            testID='mm_blocks_content.screen'
        >
            <MmBlocksContextProvider
                channelId={payload.channelId}
                location={payload.location}
                postId={payload.postId}
                imagesMetadata={payload.imagesMetadata}
                inlineMarkdownActions={payload.inlineMarkdownActions}
                layoutWidth={layoutWidth}
                childLayout={payload.childLayout}
            >
                <ScrollView
                    style={styles.fullHeight}
                    contentContainerStyle={styles.scrollContent}
                    testID='mm_blocks_content.scroll_view'
                >
                    <View onLayout={handleLayout}>
                        {payload.renderContent()}
                    </View>
                </ScrollView>
            </MmBlocksContextProvider>
        </SafeAreaView>
    );
};

export default MmBlocksContent;
