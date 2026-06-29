// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {changeOpacity} from '@utils/theme';
import {secureGetFromRecord} from '@utils/types';

/** Matches web `.mm-blocks-button--good` / `--success` in block_renderer.scss */
const MM_BUTTON_GOOD_COLOR = '#339970';

/** Matches web `.mm-blocks-button--warning` in block_renderer.scss */
const MM_BUTTON_WARNING_COLOR = '#CC8F00';

const MM_BUTTON_SEMANTIC_STYLES = new Set<MmButtonStyle>([
    'default',
    'primary',
    'danger',
    'good',
    'success',
    'warning',
]);

const MM_BUTTON_HEX_COLOR = /^#(?:[0-9a-fA-F]{3}){1,2}$/;

/**
 * Preserves semantic styles and hex colors from legacy attachment actions / integration payloads.
 * Returns `undefined` for omitted or invalid values.
 */
export function parseMmButtonStyle(style: string | undefined): string | undefined {
    if (!style) {
        return undefined;
    }
    if (MM_BUTTON_SEMANTIC_STYLES.has(style as MmButtonStyle)) {
        return style;
    }
    if (MM_BUTTON_HEX_COLOR.test(style)) {
        return style;
    }
    return undefined;
}

export function isMmButtonSemanticStyle(style: string | undefined): style is MmButtonStyle {
    return Boolean(style && MM_BUTTON_SEMANTIC_STYLES.has(style as MmButtonStyle));
}

export function isMmButtonHexColor(style: string | undefined): boolean {
    return Boolean(style && MM_BUTTON_HEX_COLOR.test(style));
}

export type MmButtonColors = {
    backgroundColor: string;
    color: string;
};

function mmButtonTertiaryColors(color: string): MmButtonColors {
    return {
        backgroundColor: changeOpacity(color, 0.08),
        color,
    };
}

function resolveMmButtonAccentColor(style: string, theme: Theme): string | undefined {
    if (isMmButtonHexColor(style)) {
        return style;
    }
    const fromTheme = secureGetFromRecord(theme, style);
    if (typeof fromTheme === 'string') {
        return fromTheme;
    }
    return undefined;
}

/** Colors for mm_blocks buttons — default uses `btn-tertiary` (theme button bg), not center channel gray. */
export function resolveMmButtonColors(style: string | undefined, theme: Theme): MmButtonColors {
    const buttonStyle = style ?? 'default';

    if (buttonStyle === 'primary') {
        return {
            backgroundColor: theme.buttonBg,
            color: theme.buttonColor,
        };
    }

    if (buttonStyle === 'default') {
        return mmButtonTertiaryColors(theme.buttonBg);
    }
    if (buttonStyle === 'danger') {
        return mmButtonTertiaryColors(theme.errorTextColor);
    }
    if (buttonStyle === 'good' || buttonStyle === 'success') {
        return mmButtonTertiaryColors(MM_BUTTON_GOOD_COLOR);
    }
    if (buttonStyle === 'warning') {
        return mmButtonTertiaryColors(MM_BUTTON_WARNING_COLOR);
    }

    const customColor = resolveMmButtonAccentColor(buttonStyle, theme);
    if (customColor) {
        return mmButtonTertiaryColors(customColor);
    }

    return mmButtonTertiaryColors(theme.buttonBg);
}
