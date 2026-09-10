// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {PortalHost} from '@gorhom/portal';
import React, {useCallback, useEffect, useState} from 'react';
import {StyleSheet, View, type LayoutChangeEvent} from 'react-native';

import ChannelBanner from '@components/channel_banner';
import SheetTabBarScrim from '@components/chrome/sheet_tab_bar_scrim';
import {KeyboardAwarePostDraftContainer} from '@components/keyboard_aware_post_draft_container';
import PostDraft from '@components/post_draft';
import ScheduledPostIndicator from '@components/scheduled_post_indicator';
import {Screens} from '@constants';
import {isPlatformUiIos} from '@constants/platform_ui';
import {BOTTOM_TAB_HEIGHT} from '@constants/view';
import {KeyboardStateProvider} from '@context/keyboard_state';
import {useIsTablet} from '@hooks/device';
import {useSheetStyle} from '@hooks/sheet_style';

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

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },
    sheetBody: {
        flex: 1,
    },
    sheetChrome: {
        left: 0,
        position: 'absolute',
        right: 0,
        top: 0,
        zIndex: 6,
    },
});

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
    const platformUi = isPlatformUiIos();
    const sheetStyle = useSheetStyle(marginTop);

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
        <View style={sheetStyle}>
            {/* First child must lead to FlatList (iOS 26 scroll-edge). */}
            <View style={styles.sheetBody}>
                {body}
            </View>
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
