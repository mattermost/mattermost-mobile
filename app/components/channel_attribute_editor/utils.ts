// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {BUTTON_HEIGHT} from '@screens/bottom_sheet/button';
import {TITLE_HEIGHT, TITLE_LINE_HEIGHT, TITLE_SEPARATOR_MARGIN, TITLE_SEPARATOR_MARGIN_TABLET} from '@screens/bottom_sheet/content';
import {bottomSheetSnapPoint} from '@utils/helpers';

import type {ResolvedChannelAttribute} from '@utils/channel_attributes';

export const OPTION_ROW_HEIGHT = 48;
export const TEXT_INPUT_MARGIN_BOTTOM = 12;

// Focused FloatingTextInput (it autofocuses): 48 plus a 2px border top and bottom.
const TEXT_INPUT_HEIGHT = 52;

const TITLE_SEPARATOR_LINE_HEIGHT = 1;

// Android reports a 0 safe-area inset while the keyboard is up, so Save needs its own padding.
export const SAVE_BUTTON_BOTTOM_PADDING = 12;

export const SHEET_MAX_ROWS = 5;

// Same '80%' ceiling the other sheets use.
const MAX_SHEET_HEIGHT_RATIO = 0.8;

type FieldType = ResolvedChannelAttribute['field']['type'];

export function toggleSelection(ids: string[], optionId: string): string[] {
    return ids.includes(optionId) ? ids.filter((id) => id !== optionId) : [...ids, optionId];
}

/**
 * The height is only an estimate: content scrolls and Save sits outside the scroll area,
 * so an underestimate costs a scroll, never a clipped Save.
 */
export function getChannelAttributeEditorSnapPoints({
    totalRows,
    fieldType,
    bottomInset,
    isTablet,
    windowHeight,
}: {
    totalRows: number;
    fieldType: FieldType;
    bottomInset: number;
    isTablet: boolean;
    windowHeight: number;
}): number[] {
    const hasSaveButton = fieldType === 'text' || fieldType === 'multiselect';
    const separatorMargin = isTablet ? TITLE_SEPARATOR_MARGIN_TABLET : TITLE_SEPARATOR_MARGIN;
    const rowsHeight = fieldType === 'text' ? TEXT_INPUT_HEIGHT + TEXT_INPUT_MARGIN_BOTTOM : bottomSheetSnapPoint(Math.min(totalRows, SHEET_MAX_ROWS), OPTION_ROW_HEIGHT);

    const estimatedHeight = rowsHeight +
        TITLE_HEIGHT + TITLE_LINE_HEIGHT + separatorMargin + TITLE_SEPARATOR_LINE_HEIGHT +

        // BUTTON_HEIGHT excludes the button's safe-area padding.
        (hasSaveButton ? BUTTON_HEIGHT + bottomInset + SAVE_BUTTON_BOTTOM_PADDING : 0);

    const maxHeight = windowHeight * MAX_SHEET_HEIGHT_RATIO;

    // GenericBottomSheetRoute adds this to index 1 only, after this returns. A third point must
    // clear the second by more than that or Gorhom gets an unordered array.
    const routeMargin = bottomInset;

    // Leave room for routeMargin so the on-screen height stays under the ceiling.
    const collapsedHeight = Math.min(estimatedHeight, maxHeight - routeMargin);

    // Text needs no taller point: keyboardBehavior="interactive" grows the sheet by the keyboard height.
    const rowsOverflow = fieldType !== 'text' && totalRows > SHEET_MAX_ROWS;
    if (!rowsOverflow || collapsedHeight + routeMargin >= maxHeight) {
        return [1, collapsedHeight];
    }

    return [1, collapsedHeight, maxHeight];
}
