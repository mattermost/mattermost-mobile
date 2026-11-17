// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useCallback, useEffect, useMemo, useState} from 'react';
import {BackHandler, useWindowDimensions} from 'react-native';

import {AppFieldTypes} from '@constants/apps';
import {isAppSelectOption} from '@utils/dialog_utils';
import {secureGetFromRecord} from '@utils/types';

// Below this the cells of a grid are not edited in place. It is a width, not a
// platform: a tablet has the room for a row of inputs and a phone does not, and
// the same dialog should follow the viewport it is actually in — including when
// a tablet is rotated. 600dp is where two ordinary columns plus the sticky one
// stop being most of the screen.
export const GRID_INLINE_EDIT_MIN_WIDTH = 600;

// Rows of a grid are collapsibles nested inside the grid container, so finding
// the open one means walking the tree rather than scanning the top level.
export function findCollapsible(fields: AppField[] | undefined, name: string): AppField | undefined {
    for (const field of fields || []) {
        if (field.type !== AppFieldTypes.COLLAPSIBLE) {
            continue;
        }
        if (field.name === name) {
            return field;
        }
        const found = findCollapsible(field.collapsible_config?.fields, name);
        if (found) {
            return found;
        }
    }
    return undefined;
}

/**
 * A row's stable identity. Normally its own name — the way the server keys a
 * row across refreshes. DialogElement.name is optional, though, so a malformed
 * grid can hand us a nameless row; rather than drop it (its required cells would
 * then fail submission with nothing on screen to fix), fall back to the row's
 * tree path from the form root. gridPath is the grid container's own path and
 * rawIndex the row's index among the container's fields, so the result is unique
 * even across several unnamed grids — unlike the row's name, which may be blank.
 */
export function gridRowKey(gridPath: string, row: AppField, rawIndex: number): string {
    return row.name || `${gridPath}/${rawIndex}`;
}

/**
 * Walks a '/'-separated index path (the childPath convention from
 * apps_form_component) into the unfiltered field tree. Each step indexes the
 * current level's fields; the next level is that field's collapsible children.
 */
function findFieldByPath(fields: AppField[] | undefined, path: string): AppField | undefined {
    let current = fields;
    let found: AppField | undefined;
    for (const part of path.split('/')) {
        found = current?.[Number(part)];
        if (!found) {
            return undefined;
        }
        current = found.collapsible_config?.fields;
    }
    return found;
}

/**
 * Resolves an open row from the key gridRowKey produced: a named row by name
 * anywhere in the tree, an unnamed row by its tree path. The path form resolves
 * unnamed rows even inside unnamed grids, which a name-based key cannot.
 */
export function findGridRow(fields: AppField[] | undefined, key: string): AppField | undefined {
    return findCollapsible(fields, key) ?? findFieldByPath(fields, key);
}

/**
 * Owns which grid row is open on its own screen, and whether there is room to
 * skip that step and edit the table in place.
 *
 * The open row is held by name rather than as the field itself, so a refresh
 * that rebuilds the form from the server does not leave a stale copy of the
 * row on screen.
 */
export default function useGridRow(fields: AppField[] | undefined, submitButtons: string | undefined, values: AppFormValues) {
    const {width} = useWindowDimensions();
    const inlineEdit = width >= GRID_INLINE_EDIT_MIN_WIDTH;

    const [openRowName, setOpenRowName] = useState<string | undefined>(undefined);

    const openRow = useMemo(
        () => (openRowName ? findGridRow(fields, openRowName) : undefined),
        [fields, openRowName],
    );

    const closeRow = useCallback(() => setOpenRowName(undefined), []);

    /**
     * The row's first cell is its name, the way the grid's first column is the
     * row's identity. It tracks the value as it is typed, because a label the
     * server baked in goes stale on the first keystroke and leaves no way to
     * tell two new rows apart. The dialog's own label is the fallback while
     * that cell is still empty.
     */
    const rowTitle = useCallback((row: AppField): string => {
        const firstCell = (row.collapsible_config?.fields || []).find((f) => f.name && f.name !== submitButtons);

        // Never surface a password as the row's title: it would show as plain
        // text above the secure input on the row's own screen. Fall back to the
        // row label or name instead.
        if (firstCell?.subtype === 'password') {
            return row.label || row.name || '';
        }
        const value = firstCell?.name ? secureGetFromRecord(values, firstCell.name) : undefined;
        const text = isAppSelectOption(value) ? value.label : value;
        const typed = typeof text === 'string' ? text.trim() : '';
        return typed || row.label || row.name || '';
    }, [submitButtons, values]);

    // A row's screen is a step inside the dialog, so the hardware back button
    // should leave it rather than dismiss the whole dialog.
    useEffect(() => {
        if (!openRow) {
            return undefined;
        }
        const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
            closeRow();
            return true;
        });
        return () => subscription.remove();
    }, [openRow, closeRow]);

    // A grid being edited row by row cannot stay open once the viewport is
    // wide enough to edit the table itself.
    useEffect(() => {
        if (inlineEdit) {
            setOpenRowName(undefined);
        }
    }, [inlineEdit]);

    return {inlineEdit, openRow, setOpenRowName, closeRow, rowTitle};
}
