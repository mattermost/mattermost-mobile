// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import {BORDER_DEFAULT_WIDTH, ADORNMENT_TO_INPUT_SPACE, INPUT_CONTAINER_HORIZONTAL_SPACING, INPUT_CONTAINER_VERTICAL_SPACING} from './constants';

export const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        width: '100%',
    },
    errorContainer: {
        flexDirection: 'row',
    },
    errorIcon: {
        color: theme.errorTextColor,
        fontSize: 14,
        marginRight: 7,
        top: 5,
    },
    errorText: {
        color: theme.errorTextColor,
        fontFamily: 'OpenSans',
        fontSize: 12,
        lineHeight: 16,
        paddingVertical: 5,
    },
    label: {
        position: 'absolute',
        color: changeOpacity(theme.centerChannelColor, 0.64),
        left: 16,
        fontFamily: 'OpenSans',
        fontSize: 16,
        zIndex: 10,
        maxWidth: 315,
    },
    smallLabel: {
        fontSize: 10,
    },
    readOnly: {
        backgroundColor: changeOpacity(theme.centerChannelBg, 0.16),
    },
    textInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: INPUT_CONTAINER_VERTICAL_SPACING,
        paddingHorizontal: INPUT_CONTAINER_HORIZONTAL_SPACING,
        borderColor: changeOpacity(theme.centerChannelColor, 0.16),
        borderRadius: 4,
        borderWidth: BORDER_DEFAULT_WIDTH,
        backgroundColor: theme.centerChannelBg,
    },
    textInput: {
        fontFamily: 'OpenSans',
        fontSize: 16,
        lineHeight: 24,
        color: theme.centerChannelColor,
        flex: 1,
        padding: 0,
    },
    startAdornment: {
        marginRight: ADORNMENT_TO_INPUT_SPACE,
    },
    endAdornment: {
        marginLeft: ADORNMENT_TO_INPUT_SPACE,
    },
}));
