// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {useIntl} from 'react-intl';
import {Text, View} from 'react-native';
import {RTCView} from 'react-native-webrtc';

import CallAvatar from '@calls/components/call_avatar';
import CompassIcon from '@components/compass_icon';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';
import {displayUsername} from '@utils/user';

import type {CallSession, CallsTheme} from '@calls/types/calls';

// Single source of truth for the gap around a tile: video_grid.tsx subtracts it
// when it works out how many tiles fit on a row, so the two must never drift.
export const TILE_MARGIN = 4;

// The avatar shown when a participant has no camera on. Sized as a fraction of
// the tile's shorter side so it stays inside the tile at every grid density,
// clamped so it is neither invisible on a strip tile nor huge on a lone tile.
const AVATAR_FRACTION = 0.4;
const AVATAR_MIN = 32;
const AVATAR_MAX = 96;

const getStyleSheet = makeStyleSheetFromTheme((theme: CallsTheme) => ({
    tile: {
        margin: TILE_MARGIN,
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: theme.callsBgRgb,
        justifyContent: 'center',
        alignItems: 'center',
    },
    video: {
        width: '100%',
        height: '100%',
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 6,
        gap: 4,
    },
    name: {
        color: theme.buttonColor,
        flexShrink: 1,
        ...typography('Body', 75, 'SemiBold'),
    },
    muteIcon: {
        color: theme.dndIndicator,
    },
}));

type Props = {
    session: CallSession;
    url?: string;
    teammateNameDisplay: string;

    // Explicit size supplied by the grid: tiles cannot size themselves with
    // flex alone (see video_grid.tsx).
    tileWidth: number;
    tileHeight: number;
}

const VideoTile = ({session, url, teammateNameDisplay, tileWidth, tileHeight}: Props) => {
    const theme = useTheme() as CallsTheme;
    const intl = useIntl();
    const serverUrl = useServerUrl();
    const style = getStyleSheet(theme);

    const sizeStyle = useMemo(() => ({width: tileWidth, height: tileHeight}), [tileWidth, tileHeight]);
    const avatarSize = useMemo(() => {
        const fromTile = Math.round(Math.min(tileWidth, tileHeight) * AVATAR_FRACTION);
        return Math.max(AVATAR_MIN, Math.min(AVATAR_MAX, fromTile));
    }, [tileWidth, tileHeight]);

    return (
        <View
            style={[style.tile, sizeStyle]}
            testID={`call_screen.video.tile.${session.sessionId}`}
        >
            {url ? (
                <RTCView
                    streamURL={url}
                    objectFit='cover'
                    style={style.video}
                />
            ) : (
                <CallAvatar
                    userModel={session.userModel}
                    size={avatarSize}
                    serverUrl={serverUrl}
                />
            )}
            <View style={style.footer}>
                {session.muted && (
                    <CompassIcon
                        name='microphone-off'
                        size={14}
                        style={style.muteIcon}
                    />
                )}
                <Text
                    style={style.name}
                    numberOfLines={1}
                >
                    {displayUsername(session.userModel, intl.locale, teammateNameDisplay)}
                </Text>
            </View>
        </View>
    );
};

export default VideoTile;
