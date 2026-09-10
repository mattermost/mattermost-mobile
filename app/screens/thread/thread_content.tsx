// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {PortalHost} from '@gorhom/portal';
import React, {useCallback, useEffect, useState} from 'react';
import {View, type LayoutChangeEvent} from 'react-native';

import ChannelBanner from '@components/channel_banner';
import SheetTabBarScrim from '@components/chrome/sheet_tab_bar_scrim';
import {KeyboardAwarePostDraftContainer} from '@components/keyboard_aware_post_draft_container';
import PostDraft from '@components/post_draft';
import ScheduledPostIndicator from '@components/scheduled_post_indicator';
import {Screens} from '@constants';
import {CHANNEL_SHEET_CONTENT_TOP_INSET, CHANNEL_SHEET_RADIUS, isPlatformUiIos} from '@constants/platform_ui';
import {KeyboardStateProvider} from '@context/keyboard_state';
import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme} from '@utils/theme';

import ThreadPostList from './thread_post_list';

import type PostModel from '@typings/database/models/servers/post';

type ThreadContentProps = {
    rootId: string;
    rootPost: PostModel;
    scheduledPostCount: number;
    containerHeight: number;
    enabled?: boolean;
    includeChannelBanner?: boolean;
    marginTop?: number;
}

const THREAD_POST_DRAFT_TESTID = 'thread.post_draft';

// This follows the same pattern as draft_input.tsx: `${testID}.post.input`
const THREAD_POST_INPUT_NATIVE_ID = `${THREAD_POST_DRAFT_TESTID}.post.input`;

const PORTAL_NAME = 'thread_autocomplete';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    flex: {
        flex: 1,
    },
    sheet: {
        backgroundColor: theme.centerChannelBg,
        borderTopLeftRadius: CHANNEL_SHEET_RADIUS,
        borderTopRightRadius: CHANNEL_SHEET_RADIUS,
        flex: 1,
        overflow: 'hidden',
    },
    sheetBody: {
        flex: 1,
    },
    sheetTopCover: {
        backgroundColor: theme.centerChannelBg,
        height: CHANNEL_SHEET_CONTENT_TOP_INSET,
        left: 0,
        pointerEvents: 'none',
        position: 'absolute',
        right: 0,
        top: 0,
        zIndex: 5,
    },
    sheetChrome: {
        left: 0,
        position: 'absolute',
        right: 0,
        top: 0,
        zIndex: 6,
    },
}));

const ThreadContent = ({
    rootId,
    rootPost,
    scheduledPostCount,
    containerHeight,
    enabled = true,
    includeChannelBanner,
    marginTop = 0,
}: ThreadContentProps) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const platformUi = isPlatformUiIos();

    // Measure real chrome height — includeChannelBanner can be true while ChannelBanner
    // returns null, which previously reserved CHANNEL_BANNER_HEIGHT as a phantom gap.
    const [sheetChromeHeight, setSheetChromeHeight] = useState(0);

    useEffect(() => {
        setSheetChromeHeight(0);
    }, [includeChannelBanner, rootId]);

    const onChromeLayout = useCallback((e: LayoutChangeEvent) => {
        setSheetChromeHeight(e.nativeEvent.layout.height);
    }, []);

    // Extra list padding only for overlay chrome; rounded-top clearance is sheetTopCover +
    // inverted list paddingBottom in PostList.
    const listContainerStyle = platformUi ? [
        styles.flex,
        sheetChromeHeight > 0 && {paddingTop: sheetChromeHeight},
    ] : styles.flex;

    const body = (
        <KeyboardStateProvider

            // NativeTabs hide when the software keyboard occupies the bottom; resting
            // clearance (including hardware keyboard) is draft_input marginBottom.
            tabBarHeight={0}
            enabled={enabled}
        >
            <KeyboardAwarePostDraftContainer
                textInputNativeID={THREAD_POST_INPUT_NATIVE_ID}
                containerStyle={listContainerStyle}
                renderList={() => (
                    platformUi ? (
                        <>
                            <ThreadPostList rootPost={rootPost}/>
                            <SheetTabBarScrim/>
                        </>
                    ) : (
                        <>
                            {includeChannelBanner &&
                            <ChannelBanner
                                channelId={rootPost.channelId}
                                isTopItem={true}
                                skipHeaderOffset={true}
                            />
                            }
                            <ThreadPostList
                                rootPost={rootPost}
                            />
                        </>
                    )
                )}
            >
                {scheduledPostCount > 0 &&
                    <ScheduledPostIndicator
                        isThread={true}
                        scheduledPostCount={scheduledPostCount}
                    />
                }
                <PostDraft
                    channelId={rootPost.channelId}
                    rootId={rootId}
                    testID={THREAD_POST_DRAFT_TESTID}
                    containerHeight={containerHeight}
                    isChannelScreen={false}
                    location={Screens.THREAD}
                    portalName={PORTAL_NAME}
                />
            </KeyboardAwarePostDraftContainer>
            <PortalHost name={PORTAL_NAME}/>
        </KeyboardStateProvider>
    );

    if (!platformUi) {
        return body;
    }

    return (
        <View style={[styles.sheet, marginTop > 0 && {marginTop}]}>
            {/* First child must lead to FlatList (iOS 26 scroll-edge). */}
            <View style={styles.sheetBody}>
                {body}
            </View>
            <View
                style={[
                    styles.sheetTopCover,
                    {
                        backgroundColor: theme.centerChannelBg,
                        height: CHANNEL_SHEET_CONTENT_TOP_INSET,
                    },
                ]}
            />
            {includeChannelBanner &&
            <View
                onLayout={onChromeLayout}
                style={styles.sheetChrome}
            >
                <ChannelBanner
                    channelId={rootPost.channelId}
                    isTopItem={true}
                    skipHeaderOffset={true}
                />
            </View>
            }
        </View>
    );
};

export default ThreadContent;
