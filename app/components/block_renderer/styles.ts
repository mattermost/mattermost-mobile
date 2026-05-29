// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {type ViewStyle} from 'react-native';

import {getStatusColors} from '@utils/message_attachment';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

const MM_CONTAINER_GAP_PX: Record<'small' | 'medium' | 'large' | 'xlarge', number> = {
    small: 8,
    medium: 12,
    large: 16,
    xlarge: 20,
};

export const MM_CONTAINER_MAX_HEIGHT_PX: Record<'small' | 'medium' | 'large', number> = {
    small: 160,
    medium: 280,
    large: 420,
};

const MM_CONTAINER_ACCENT_SEMANTIC = new Set<MmContainerAccentSemantic>([
    'default',
    'primary',
    'good',
    'warning',
    'danger',
]);

export function isMmContainerSemanticAccent(accent: string): accent is MmContainerAccentSemantic {
    return MM_CONTAINER_ACCENT_SEMANTIC.has(accent as MmContainerAccentSemantic);
}

export function containerGapStyle(gap: MmContainerBlock['gap'] | undefined): ViewStyle {
    const key = gap === 'none' || gap === 'small' || gap === 'medium' || gap === 'large' || gap === 'xlarge' ? gap : 'medium';
    if (key === 'none') {
        return {gap: 0};
    }
    return {gap: MM_CONTAINER_GAP_PX[key]};
}

export const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    const STATUS_COLORS = getStatusColors(theme);
    return {
        textSubtle: {
            color: changeOpacity(theme.centerChannelColor, 0.75),
        },
        textSmall: {
            ...typography('Body', 75),
        },
        divider: {
            borderBottomWidth: 1,
            borderBottomColor: changeOpacity(theme.centerChannelColor, 0.12),
        },
        dividerVertical: {
            borderLeftWidth: 1,
            borderLeftColor: changeOpacity(theme.centerChannelColor, 0.12),
            alignSelf: 'stretch',
        },
        columnSet: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            width: '100%',
            minWidth: 0,
        },
        columnStretch: {
            flexGrow: 1,
            flexShrink: 1,
            flexBasis: 120,
            minWidth: 0,
        },
        columnAuto: {
            flexGrow: 0,
            flexShrink: 1,
        },
        container: {
            gap: 0,
            minWidth: 0,
        },
        containerHorizontal: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            alignItems: 'flex-start',
        },
        containerVertical: {
            flexDirection: 'column',
        },
        containerBorder: {
            borderWidth: 1,
            borderColor: changeOpacity(theme.centerChannelColor, 0.16),
            borderRadius: 4,
            padding: 12,
            maxWidth: 700,
        },
        containerBgGray: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.04),
        },
        containerAccent: {
            borderLeftWidth: 4,
            padding: 12,
            maxWidth: 700,
        },
        accentDefault: {borderLeftColor: changeOpacity(STATUS_COLORS.primary, 0.32)},
        accentPrimary: {borderLeftColor: STATUS_COLORS.primary},
        accentGood: {borderLeftColor: STATUS_COLORS.good},
        accentWarning: {borderLeftColor: STATUS_COLORS.warning},
        accentDanger: {borderLeftColor: STATUS_COLORS.danger},
        imageRow: {
            flexDirection: 'row',
        },
        imageAlignLeft: {justifyContent: 'flex-start'},
        imageAlignCenter: {justifyContent: 'center'},
        imageAlignRight: {justifyContent: 'flex-end'},
        collapsible: {
            minWidth: 0,
            borderWidth: 1,
            borderColor: changeOpacity(theme.centerChannelColor, 0.12),
            borderRadius: 4,
        },
        collapsibleHeader: {
            flexDirection: 'row',
            alignItems: 'center',
            width: '100%',
            paddingVertical: 8,
            paddingHorizontal: 10,
            gap: 8,
        },
        collapsibleHeaderPressed: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.04),
        },
        collapsibleChevron: {
            flexShrink: 0,
            color: changeOpacity(theme.centerChannelColor, 0.56),
        },
        collapsibleHeaderBody: {
            flex: 1,
            minWidth: 0,
        },
        collapsibleContent: {
            paddingBottom: 10,
            paddingHorizontal: 10,
        },
        message: {
            color: theme.centerChannelColor,
            ...typography('Body', 100),
        },
    };
});
