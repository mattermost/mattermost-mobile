// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import fontelloConfig from '@mattermost/compass-icons/config.json';
import {createIconSet, type IconComponent} from '@react-native-vector-icons/common';

import {compassGlyphMap} from '@assets/compassGlyphMap';

export type CompassIconName = keyof typeof compassGlyphMap;

function createCompassIcons(): IconComponent<Record<CompassIconName, number>> {
    const glyphMap: Record<string, number> = {};
    fontelloConfig.glyphs.forEach((glyph) => {
        glyphMap[glyph.css] = glyph.code;
    });

    const fontFamily = fontelloConfig.name || 'compass-icons';
    const fontFileName = 'compass-icons.ttf';

    return createIconSet<Record<CompassIconName, number>>(glyphMap as Record<CompassIconName, number>, {
        postScriptName: fontFamily,
        fontFileName: fontFileName || `${fontFamily}.ttf`,
    });
}

const CompassIcon = createCompassIcons();

export default CompassIcon;
