// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useState} from 'react';
import {ScrollView, View, type LayoutChangeEvent} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {
    MmBlocksFieldUploadingContext,
    MmBlocksHasUploadingFieldsContext,
    MmBlocksInteractionsDisabledContext,
    MmBlocksLookupContext,
} from '@components/block_renderer/context';
import {RelayedMmBlocksForm} from '@components/block_renderer/form';
import {MmBlocksContextProvider, type MmBlocksExpandedContentPayload} from '@components/block_renderer/mm_blocks_context_provider';
import FormattedText from '@components/formatted_text';
import {Screens} from '@constants';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import useInitialValue from '@hooks/initial_value';
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
    const payload = useInitialValue(() => CallbackStore.getCallback<MmBlocksExpandedContentPayload>());
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const [layoutWidth, setLayoutWidth] = useState<number | undefined>(undefined);

    const handleLayout = useCallback((event: LayoutChangeEvent) => {
        const width = Math.round(event.nativeEvent.layout.width);
        if (width > 0) {
            setLayoutWidth(width);
        }
    }, []);

    useAndroidHardwareBackHandler(Screens.MM_BLOCKS_CONTENT, navigateBack);

    useEffect(() => {
        return () => {
            CallbackStore.removeCallback();
        };
    }, []);

    if (!payload) {
        return (
            <View style={styles.noContentContainer}>
                <FormattedText
                    id='mm_blocks_content.cannot_display'
                    defaultMessage='Cannot display content'
                    style={styles.noContentText}
                />
            </View>
        );
    }

    const content = (
        <ScrollView
            style={styles.fullHeight}
            contentContainerStyle={styles.scrollContent}
            testID='mm_blocks_content.scroll_view'
        >
            <View onLayout={handleLayout}>
                {payload.renderContent()}
            </View>
        </ScrollView>
    );

    const withForm = payload.formApi ? (
        <RelayedMmBlocksForm api={payload.formApi}>
            {content}
        </RelayedMmBlocksForm>
    ) : content;

    return (
        <SafeAreaView
            style={styles.container}
            testID='mm_blocks_content.screen'
        >
            <MmBlocksContextProvider
                channelId={payload.channelId}
                context={payload.context}
                location={payload.location}
                postId={payload.postId}
                imagesMetadata={payload.imagesMetadata}
                inlineMarkdownActions={payload.inlineMarkdownActions}
                layoutWidth={layoutWidth}
            >
                <MmBlocksInteractionsDisabledContext.Provider value={payload.interactionsDisabled ?? false}>
                    <MmBlocksFieldUploadingContext.Provider value={payload.setFieldUploading}>
                        <MmBlocksHasUploadingFieldsContext.Provider value={payload.hasUploadingFields ?? false}>
                            <MmBlocksLookupContext.Provider value={payload.onLookup}>
                                {withForm}
                            </MmBlocksLookupContext.Provider>
                        </MmBlocksHasUploadingFieldsContext.Provider>
                    </MmBlocksFieldUploadingContext.Provider>
                </MmBlocksInteractionsDisabledContext.Provider>
            </MmBlocksContextProvider>
        </SafeAreaView>
    );
};

export default MmBlocksContent;
