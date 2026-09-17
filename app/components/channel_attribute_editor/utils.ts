// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {isEdgeToEdge} from '@constants/device';
import {NOT_EDGE_TO_EDGE_BOTTOM_SHEET_MARGIN} from '@constants/view';
import {BUTTON_HEIGHT} from '@screens/bottom_sheet/button';
import {TITLE_HEIGHT, TITLE_LINE_HEIGHT, TITLE_SEPARATOR_MARGIN, TITLE_SEPARATOR_MARGIN_TABLET} from '@screens/bottom_sheet/content';
import {bottomSheetSnapPoint} from '@utils/helpers';

import type {ResolvedChannelAttribute} from '@utils/channel_attributes';

export const OPTION_ROW_HEIGHT = 48;
export const TEXT_INPUT_MARGIN_BOTTOM = 12;

// FloatingTextInput's own rendered box while focused: DEFAULT_INPUT_HEIGHT (48)
// plus its focused 2px border on both edges. The field autoFocuses on open, so
// this is the height it actually renders at, not its unfocused 1px-border size.
const TEXT_INPUT_HEIGHT = 52;

const TITLE_SEPARATOR_LINE_HEIGHT = 1;

// A fixed cushion under Save, on top of BottomSheetButton's own safe-area
// padding: Android reports that inset as 0 while a keyboard is up (real or,
// with a hardware/passthrough keyboard, merely believed to be), which the text
// editor's autofocused input triggers on open and the option editors never do.
export const SAVE_BUTTON_BOTTOM_PADDING = 12;

// Past this many rows the sheet opens at a fraction of the window rather than
// growing to fit every row, and the rest is reached by scrolling.
export const SHEET_MAX_ROWS = 5;

// The sheet never opens taller than this fraction of the window, matching the
// '80%' ceiling every other sheet in the app already opens at.
const MAX_SHEET_HEIGHT_RATIO = 0.8;

type FieldType = ResolvedChannelAttribute['field']['type'];

/**
 * Snap points for the Set {attribute} sheet, ordered bottom to top as Gorhom
 * requires.
 *
 * The numeric point is a starting estimate, not a guarantee: a long option name
 * or a wrapped title can still make the real content taller than this predicts.
 * That is fine because the sheet's own content — title included — is rendered
 * inside a scroll area, and Save is laid out in its own row after that area
 * rather than inside it: an underestimate here costs a scroll, never a clipped
 * Save button. The estimate only exists so the sheet opens at roughly the right
 * height instead of always starting at the tallest point allowed.
 *
 * totalRows is the full, unclamped row count so the caller does not have to
 * duplicate the SHEET_MAX_ROWS comparison to know whether a taller snap point
 * is worth offering.
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

        // BUTTON_HEIGHT does not include the button's own bottom safe-area padding
        // (see screens/bottom_sheet/button.tsx), so that inset is added here too.
        (hasSaveButton ? BUTTON_HEIGHT + bottomInset + SAVE_BUTTON_BOTTOM_PADDING : 0);

    const maxHeight = windowHeight * MAX_SHEET_HEIGHT_RATIO;

    // GenericBottomSheetRoute adds this same margin to index 1 (and only index
    // 1) after this function returns, to give every sheet a bottom cushion. A
    // third point too close to the second would end up smaller than the second
    // once that addition lands, leaving Gorhom an unordered array — so a third
    // point is only offered when it clears the second by more than that.
    const routeMargin = isEdgeToEdge ? bottomInset : NOT_EDGE_TO_EDGE_BOTTOM_SHEET_MARGIN;

    // Capped at maxHeight - routeMargin, not maxHeight itself: the route adds
    // routeMargin to this point after this function returns, so capping at
    // maxHeight here would let the effective, on-screen height exceed the 80%
    // ceiling by up to that margin.
    const collapsedHeight = Math.min(estimatedHeight, maxHeight - routeMargin);

    // A taller point is only worth offering when there are more rows than the
    // collapsed estimate already accounts for. A text field never has more than
    // one row and never needs one for keyboard purposes either: the caller
    // opens it with keyboardBehavior="interactive", which grows the sheet by
    // exactly the keyboard's height instead of jumping to a configured snap
    // point, so there is nothing here for a keyboard to need room to extend to.
    const rowsOverflow = fieldType !== 'text' && totalRows > SHEET_MAX_ROWS;
    if (!rowsOverflow || collapsedHeight + routeMargin >= maxHeight) {
        return [1, collapsedHeight];
    }

    return [1, collapsedHeight, maxHeight];
}
