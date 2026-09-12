// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo, useState} from 'react';
import {type LayoutChangeEvent, ScrollView, useWindowDimensions} from 'react-native';

import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme} from '@utils/theme';

import VideoTile, {TILE_MARGIN} from './video_tile';

import type {CallSession, CallsTheme} from '@calls/types/calls';

// Tiles are 3:4 portrait. They need an explicit size: a zero-basis `flex: 1`
// tile never overflows its line (so the grid would never wrap) and collapses to
// zero width inside a horizontal ScrollView (so the strip would render empty).
const TILE_ASPECT = 4 / 3;
const STRIP_TILE_WIDTH = 120;
const STRIP_TILE_HEIGHT = STRIP_TILE_WIDTH * TILE_ASPECT;
const STRIP_HEIGHT = STRIP_TILE_HEIGHT + (TILE_MARGIN * 2);

// Below this a tile has no room left for its name/mute footer, so we stop
// shrinking and let the ScrollView scroll instead.
const MIN_TILE_HEIGHT = 96;

// Used only until the grid has been laid out once: the header (52) plus its
// portrait spacer (12) above, and the controls sheet below. Both match
// call_screen.tsx's stylesheet; the real value replaces this on first layout.
const HEADER_AND_CONTROLS_ESTIMATE = 296;

const getStyleSheet = makeStyleSheetFromTheme((theme: CallsTheme) => ({
    container: {
        flex: 1,
        backgroundColor: theme.callsBg,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
    },
    strip: {
        flexGrow: 0,
        flexShrink: 0,
        height: STRIP_HEIGHT,
    },
    stripContent: {
        alignItems: 'center',
    },
}));

// Keep the tiles large enough to be useful while still fitting the row.
const columnsFor = (count: number) => {
    if (count <= 1) {
        return 1;
    }
    if (count <= 4) {
        return 2;
    }
    return 3;
};

type Props = {
    sessions: CallSession[];
    videoURLs: Dictionary<string>;
    teammateNameDisplay: string;
    horizontal?: boolean;
}

const VideoGrid = ({sessions, videoURLs, teammateNameDisplay, horizontal}: Props) => {
    const theme = useTheme() as CallsTheme;
    const style = getStyleSheet(theme);
    const {width: windowWidth, height: windowHeight} = useWindowDimensions();
    const [availableHeight, setAvailableHeight] = useState(0);

    const onLayout = useCallback((e: LayoutChangeEvent) => {
        setAvailableHeight(e.nativeEvent.layout.height);
    }, []);

    const gridTileSize = useMemo(() => {
        const count = sessions.length;
        const columns = columnsFor(count);
        const rows = Math.ceil(count / columns);

        // What the width alone allows.
        let tileWidth = Math.floor(windowWidth / columns) - (TILE_MARGIN * 2);
        let tileHeight = Math.floor(tileWidth * TILE_ASPECT);

        // Cap it so the rows actually fit the space between header and controls,
        // otherwise a single 4:3 full-width tile pushes its footer off screen.
        const available = availableHeight || Math.max(0, windowHeight - HEADER_AND_CONTROLS_ESTIMATE);
        const maxTileHeight = Math.floor(available / rows) - (TILE_MARGIN * 2);
        if (maxTileHeight < tileHeight) {
            tileHeight = Math.max(MIN_TILE_HEIGHT, maxTileHeight);
            tileWidth = Math.min(tileWidth, Math.floor(tileHeight / TILE_ASPECT));
        }

        return {tileWidth, tileHeight};
    }, [sessions.length, windowWidth, windowHeight, availableHeight]);

    const tileWidth = horizontal ? STRIP_TILE_WIDTH : gridTileSize.tileWidth;
    const tileHeight = horizontal ? STRIP_TILE_HEIGHT : gridTileSize.tileHeight;

    const tiles = sessions.map((session) => (
        <VideoTile
            key={session.sessionId}
            session={session}
            url={videoURLs[session.sessionId]}
            teammateNameDisplay={teammateNameDisplay}
            tileWidth={tileWidth}
            tileHeight={tileHeight}
        />
    ));

    if (horizontal) {
        return (
            <ScrollView
                horizontal={true}
                contentContainerStyle={style.stripContent}
                style={style.strip}
            >
                {tiles}
            </ScrollView>
        );
    }

    return (
        <ScrollView
            style={style.container}
            contentContainerStyle={style.grid}
            onLayout={onLayout}
        >
            {tiles}
        </ScrollView>
    );
};

export default VideoGrid;
