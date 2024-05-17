// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {blendColors, makeStyleSheetFromTheme, changeOpacity} from '@app/utils/theme';

export const getStyleSheet = makeStyleSheetFromTheme((theme) => ({
    previewThreadContainer: {
        flexDirection: 'row',
        borderColor: blendColors(theme.centerChannelBg, theme.centerChannelColor, 0.3),
        borderWidth: 1,
        width: 350,
        alignItems: 'center',
        height: 65,
        paddingLeft: 6,
        paddingRight: 6,
        borderRadius: 4,
        overflow: 'hidden',
    },
    fileContainer: {
        flexDirection: 'row',
        flex: 1,
    },
    nameContainer: {
        color: theme.centerChannelColor,
        flex: 1,
        paddingLeft: 6,
        paddingRight: 6,
    },
    sizeContainer: {
        fontSize: 12,
        color: changeOpacity(theme.centerChannelColor, 0.64),
    },
    imagePreview: {
        maxWidth: 50,
        maxHeight: 50,
        minHeight: 50,
        minWidth: 50,
        borderRadius: 20,
    },
    imageContainer: {
        borderRadius: 4,
        overflow: 'hidden',
    },
}));
