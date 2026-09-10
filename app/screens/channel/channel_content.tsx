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
import {BOTTOM_TAB_HEIGHT} from '@constants/view';
import {KeyboardStateProvider} from '@context/keyboard_state';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {makeStyleSheetFromTheme} from '@utils/theme';

import ChannelPostList from './channel_post_list';
import ChannelHeaderBookmarks from './header/bookmarks';

type ChannelContentProps = {
    channelId: string;
    marginTop: number;
    scheduledPostCount: number;
    containerHeight: number;
    enabled?: boolean;
    includeBookmarkBar?: boolean;
    includeChannelBanner?: boolean;
}

const CHANNEL_POST_DRAFT_TESTID = 'channel.post_draft';

// This follows the same pattern as draft_input.tsx: `${testID}.post.input`
const CHANNEL_POST_INPUT_NATIVE_ID = `${CHANNEL_POST_DRAFT_TESTID}.post.input`;

const PORTAL_NAME = 'channel_autocomplete';

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

    // Covers inverted FlatList overdraw in the rounded-top zone (padding/margin alone do not).
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

const ChannelContent = ({
    channelId,
    marginTop,
    scheduledPostCount,
    containerHeight,
    enabled = true,
    includeBookmarkBar,
    includeChannelBanner,
}: ChannelContentProps) => {
    const isTablet = useIsTablet();
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const platformUi = isPlatformUiIos();

    // Channel lives under the Home tab stack. NativeTabs are an overlay and hide when the
    // software keyboard occupies the bottom, so keyboard translate must not subtract
    // BOTTOM_TAB_HEIGHT (that left the pill behind the keyboard). Resting clearance
    // (including hardware keyboard) is handled by draft_input marginBottom.
    const tabBarHeight = isTablet ? BOTTOM_TAB_HEIGHT : 0;

    // Measure real chrome height. includeChannelBanner can be true while ChannelBanner
    // returns null (e.g. classification flag on, no banner text) — constant padding left a
    // phantom bookmark-sized gap and parked MoreMessages too low.
    const [sheetChromeHeight, setSheetChromeHeight] = useState(0);
    const showSheetChrome = Boolean(includeBookmarkBar || includeChannelBanner);

    useEffect(() => {
        setSheetChromeHeight(0);
    }, [channelId, showSheetChrome]);

    const onChromeLayout = useCallback((e: LayoutChangeEvent) => {
        setSheetChromeHeight(e.nativeEvent.layout.height);
    }, []);

    // Keep FlatList first in the sheet subtree for RNScreens scroll-edge finder;
    // bookmarks/banner overlay the sheet top and list padding clears them.
    // Rounded-top clearance: opaque sheetTopCover + inverted list paddingBottom (not sheet padding).
    const containerStyle = platformUi ? [
        styles.flex,
        sheetChromeHeight > 0 && {paddingTop: sheetChromeHeight},
    ] : [
        styles.flex,
        {marginTop},
    ];

    const body = (
        <KeyboardStateProvider
            tabBarHeight={tabBarHeight}
            enabled={enabled}
        >
            <KeyboardAwarePostDraftContainer
                textInputNativeID={CHANNEL_POST_INPUT_NATIVE_ID}
                containerStyle={containerStyle}
                renderList={() => (
                    <>
                        <ChannelPostList
                            channelId={channelId}
                        />
                        {platformUi && <SheetTabBarScrim/>}
                    </>
                )}
            >
                {scheduledPostCount > 0 &&
                <ScheduledPostIndicator scheduledPostCount={scheduledPostCount}/>
                }
                <PostDraft
                    channelId={channelId}
                    testID={CHANNEL_POST_DRAFT_TESTID}
                    containerHeight={containerHeight}
                    isChannelScreen={true}
                    canShowPostPriority={true}
                    location={Screens.CHANNEL}
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
        <View style={[styles.sheet, {marginTop}]}>
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
            {showSheetChrome &&
            <View
                onLayout={onChromeLayout}
                style={styles.sheetChrome}
            >
                {includeBookmarkBar &&
                <ChannelHeaderBookmarks
                    channelId={channelId}
                    embedded={true}
                />
                }
                {includeChannelBanner &&
                <ChannelBanner
                    channelId={channelId}
                    isTopItem={!includeBookmarkBar}
                    skipHeaderOffset={true}
                />
                }
            </View>
            }
        </View>
    );
};

export default ChannelContent;
