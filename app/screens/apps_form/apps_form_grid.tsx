// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {defineMessages, useIntl} from 'react-intl';
import {Pressable, type PressableStateCallbackType, ScrollView, Text, View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {AppFieldTypes} from '@constants/apps';
import {useTheme} from '@context/theme';
import {getDateValue} from '@utils/date_utils';
import {isAppSelectOption} from '@utils/dialog_utils';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {secureGetFromRecord} from '@utils/types';
import {typography} from '@utils/typography';

import {gridRowKey} from './use_grid_row';

const messages = defineMessages({
    openRow: {id: 'interactive_dialog.grid.open_row', defaultMessage: 'Open row {number}'},
});

type Props = {

    // The container field, whose collapsible_config.fields are the rows.
    field: AppField;

    // The grid container's own tree path from the form root (the childPath
    // convention). Used to give a nameless row a unique, resolvable identity;
    // see gridRowKey.
    gridPath: string;

    // Renders one leaf field as a live input, already stripped of its label,
    // help text and error: the column header carries the name, a paragraph of
    // guidance under every cell would dwarf the table, and the grid draws the
    // error itself because it has to know the row's height before it lays out
    // either pane. The label survives as the cell's accessibilityLabel, the
    // way the webapp keeps a visually hidden label in the DOM.
    //
    // Only used where the table edits in place; a narrow viewport shows values
    // instead and edits a row on its own screen.
    renderCell: (field: AppField) => React.ReactNode;

    // Renders a leaf field in full — label, help text and its own error — the
    // way the form renders any other field. Used for fields that fall outside
    // the table: a stray leaf among the rows, or a misconfigured container with
    // no rows at all. These have no column header to carry their label and no
    // reserved strip for their error, so the stripped cell renderer would hide
    // both; a failed required stray would then block submission invisibly.
    renderField: (field: AppField) => React.ReactNode;

    // Read here (not inside a cell) because the table sizes a row around its
    // error strip, and because a non-inline cell shows its value as a summary.
    values: AppFormValues;
    errors: {[name: string]: string};

    // Names excluded from the grid (the form's submit buttons field).
    excludeName?: string;

    // Opens a row in its own single-row view (from the expand column).
    onOpenRow?: (rowKey: string) => void;
};

// A column is wide enough for a short value — an order number, a weight, a
// status — without making the table scroll further than it has to. The first
// column is narrower because it is always on screen and so is the one paying
// for the others' width.
const COLUMN_WIDTH = 150;
const STICKY_COLUMN_WIDTH = 124;

// A narrow frozen column that holds only the open-row (expand) control.
const EXPAND_COLUMN_WIDTH = 44;

const HEADER_HEIGHT = 38;

// Tall enough for the 40pt input every settings component renders, plus a
// little room around it. The cell centres whatever it holds, so a select —
// which carries its own 10pt top margin — lines up with a text input beside it
// without the grid having to know the difference.
const CELL_HEIGHT = 46;

// Shown in place of a password value in a read-only summary cell.
const MASKED_VALUE = '••••••';

// Field types compact enough to edit inside a single-line cell. Everything else
// — a radio's stacked options, a date picker, a file control, a nested section,
// a multi-line textarea — is too tall for the fixed row height, so the cell
// shows a read-only summary and the field is edited in the row's own screen.
const INLINE_CELL_TYPES = new Set<AppFieldType>([
    AppFieldTypes.TEXT,
    AppFieldTypes.STATIC_SELECT,
    AppFieldTypes.DYNAMIC_SELECT,
    AppFieldTypes.USER,
    AppFieldTypes.CHANNEL,
    AppFieldTypes.BOOL,
    AppFieldTypes.ACTION_BUTTON,
    AppFieldTypes.MARKDOWN,
]);

const rendersInlineInCell = (field: AppField): boolean =>
    Boolean(field.type && INLINE_CELL_TYPES.has(field.type)) && field.subtype !== 'textarea';

// Reserved only on a row that actually has an error, and only where the cells
// are edited in place. Both panes derive it from the same errors object, which
// is what keeps the sticky column lined up with the scrolling one without
// measuring anything. See rowHeights below.
//
// It is reserved on every cell of such a row, not only the one at fault, and
// the error itself is positioned into that reserved strip rather than laid out
// in it. Otherwise the offending cell would stack input-above-error and centre
// the pair, while its neighbours centred an input alone, and the row's inputs
// would sit at two different heights.
const ERROR_HEIGHT = 34;

const getStyleFromTheme = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            marginTop: 10,
        },

        // The table draws its own outer rule; the form's fields carry 15pt
        // side margins, so it lines up with them.
        table: {
            borderColor: changeOpacity(theme.centerChannelColor, 0.12),
            borderWidth: 1,
            borderRadius: 4,
            flexDirection: 'row',
            marginHorizontal: 15,
            overflow: 'hidden',
        },

        // Without a flex basis the ScrollView lays itself out at its content's
        // full width, overflows the table and is simply clipped — there is
        // nothing left over for it to scroll. flexShrink lets it give way to
        // the sticky column and take what is left, which is what makes the
        // remaining columns reachable.
        scroll: {
            flexShrink: 1,
        },
        stickyColumn: {
            backgroundColor: theme.centerChannelBg,

            // The frozen/scroll seam is drawn by the sticky cells' own right
            // divider (see cell/headerCell), so the column itself draws none —
            // otherwise the two would stack into a double line.
        },
        row: {
            flexDirection: 'row',
        },
        headerRow: {
            flexDirection: 'row',
        },
        headerCell: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.04),
            borderBottomColor: changeOpacity(theme.centerChannelColor, 0.12),
            borderBottomWidth: 1,
            borderRightColor: changeOpacity(theme.centerChannelColor, 0.12),
            borderRightWidth: 1,
            justifyContent: 'center',
            paddingHorizontal: 8,
        },
        headerText: {
            color: changeOpacity(theme.centerChannelColor, 0.75),
            ...typography('Heading', 25),
        },

        // The cell is filled, not transparent: an unfilled cell lets the
        // screen behind show through in the gap between one row's input and
        // the next, and a strip of page background between two rows reads as
        // an empty row rather than as the space inside one.
        //
        // It draws no rule of its own either. Every settings component already
        // outlines its own input, so a cell border too would put three lines
        // between one row and the next — the input's underside, the cell's,
        // and the next input's top. The inputs' own edges are the table's
        // rules, which is why the cell is only a few points taller than one.
        cell: {
            backgroundColor: theme.centerChannelBg,
            justifyContent: 'center',

            // A vertical divider separates one column from the next. (Still no
            // horizontal rule: the inputs supply their own, and a cell border
            // too would stack three lines between one row and the next.)
            borderRightColor: changeOpacity(theme.centerChannelColor, 0.12),
            borderRightWidth: 1,

            // A select sizes itself to 100% of the cell and then adds its own
            // right margin, so it ends up a few points wider than the column.
            // Clipping here keeps it from drawing over the cell beside it;
            // without this the overhang lands on the next column's input and
            // its text reads as garbage.
            overflow: 'hidden',
        },

        cellInput: {
            width: '100%',
        },

        // A bare text input renders borderless, so inside a cell it reads as
        // plain text. Box it so an editable text cell looks tappable and reads
        // apart from a read-only summary cell. Selects and switches already
        // carry their own affordance, so only text gets this.
        cellTextInput: {
            marginVertical: 3,
            marginHorizontal: 6,
            borderRadius: 4,
            borderWidth: 1,
            borderColor: changeOpacity(theme.centerChannelColor, 0.16),
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.03),
            overflow: 'hidden',
            justifyContent: 'center',
        },

        // A summary cell shows one line of text (a taller control is edited on
        // the row's own screen), so it lays its value out horizontally with a
        // little side padding rather than centring an input.
        summaryCell: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 12,
        },
        summaryText: {
            color: theme.centerChannelColor,
            flexShrink: 1,
            ...typography('Body', 100),
        },

        // An empty summary shows a dash, so a blank column reads as "not filled
        // in" rather than as a rendering fault.
        summaryEmpty: {
            color: changeOpacity(theme.centerChannelColor, 0.4),
        },
        summaryInvalid: {
            color: theme.errorTextColor,
        },

        // The expand control's own narrow column: the icon centred, a light
        // tint so the column reads as an action rather than an empty gutter
        // (kept visible in dark mode too).
        expandCell: {
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: changeOpacity(theme.buttonBg, 0.08),
        },
        expandCellPressed: {
            backgroundColor: changeOpacity(theme.buttonBg, 0.16),
        },
        expandIcon: {
            color: theme.buttonBg,
        },
        cellError: {
            bottom: 4,
            color: theme.errorTextColor,
            left: 6,
            position: 'absolute',
            right: 6,
            ...typography('Body', 25),
        },

        // The bar marks a row whose error may be in a column that is scrolled
        // out of sight. It is on the sticky cell because that is the part of
        // the row that is always visible.
        errorMark: {
            borderLeftColor: theme.errorTextColor,
            borderLeftWidth: 3,
        },
    };
});

// A row is a child collapsible; its own children are the cells. Anything else
// among the container's children is a leaf and cannot be a row, so it is
// rendered underneath the table rather than silently dropped.
const isRow = (child: AppField) => child.type === AppFieldTypes.COLLAPSIBLE;

const cellFields = (row: AppField, excludeName?: string): AppField[] =>
    (row.collapsible_config?.fields || []).filter((f) => f.name && f.name !== excludeName);

/**
 * What a non-inline cell shows: a one-line summary of its value, since the
 * control itself is too tall to edit here. A select carries its label on the
 * chosen option, a multiselect a list of them, a date an ISO string nobody
 * wants to read across a table; a password is never shown. The row's own screen
 * edits each of these in its real control.
 */
export function displayCellValue(field: AppField | undefined, value: AppFormValue | undefined): string {
    if (value === undefined || value === null || value === false || value === '') {
        return '';
    }
    if (field?.subtype === 'password') {
        return MASKED_VALUE;
    }
    if (field?.type === AppFieldTypes.DATE || field?.type === AppFieldTypes.DATETIME) {
        const moment = getDateValue(value, field.datetime_config?.location_timezone, field.type === AppFieldTypes.DATETIME);
        return moment ? moment.format(field.type === AppFieldTypes.DATETIME ? 'lll' : 'll') : String(value);
    }
    if (Array.isArray(value)) {
        return value.map((entry) => (isAppSelectOption(entry) ? entry.label : String(entry))).filter(Boolean).join(', ');
    }
    if (isAppSelectOption(value)) {
        return value.label || '';
    }

    // A select may carry a primitive value (e.g. a server default) rather than a
    // resolved option; show the matching option's label where there is one.
    if (field?.options?.length) {
        const option = field.options.find((o) => o.value === value);
        if (option) {
            return option.label || String(value);
        }
    }
    return String(value);
}

/**
 * Lays a collapsible's child sections out as a real table: one row per child
 * section, one column per cell, column headers from the cells' own labels.
 *
 * This mirrors the webapp's AppsFormGrid, including the parts that matter when
 * a form is malformed — the table is as wide as the widest row, a short row is
 * padded on the right so its cells never slide under the wrong column, and a
 * container with no row children falls back to rendering its children plainly.
 *
 * The first column is sticky by being a separate pane outside the horizontal
 * ScrollView rather than a CSS-sticky cell. The two panes stay aligned because
 * both size row N from the same rowHeights array, so neither has to measure
 * the other.
 *
 * Where it parts company with the webapp is editing. Given room — a tablet —
 * the cells are live inputs, as on the web. On a phone they are not, and the
 * table is for reading only: a row is opened and filled in on its own screen.
 *
 * That is not a concession, it is the only thing that works. Three of five
 * columns fit on a phone, so filling a row in place means scrolling sideways,
 * and the scroll belongs to the whole table, so reaching the last column drags
 * every other row along with it. The keyboard then covers half of what is
 * left, which would need the view to chase the focused cell on both axes at
 * once. Worse, a horizontal drag that starts on a text input is taken by the
 * input as a cursor drag, so the table does not scroll at all where the user
 * naturally swipes it. Taking the inputs out of the table removes all of that:
 * nothing in it is focusable, so the swipe is unambiguous.
 */
const AppsFormGrid = ({field, gridPath, renderCell, renderField, values, errors, excludeName, onOpenRow}: Props) => {
    const intl = useIntl();
    const theme = useTheme();
    const style = getStyleFromTheme(theme);

    // A row keeps its place even without a name: its cells are addressed by
    // their own names, and a nameless row still needs to render so a required
    // cell inside it is reachable. A stray leaf, by contrast, has nothing but
    // its name to address it, so an unnamed one is dropped. Raw indices are
    // tracked alongside the rows so a nameless row's key is its true tree path.
    const rows: AppField[] = [];
    const rowRawIndices: number[] = [];
    const strays: AppField[] = [];
    (field.collapsible_config?.fields || []).forEach((child, rawIndex) => {
        if (excludeName && child.name === excludeName) {
            return;
        }
        if (isRow(child)) {
            rows.push(child);
            rowRawIndices.push(rawIndex);
        } else if (child.name) {
            strays.push(child);
        }
    });
    const children = [...rows, ...strays];

    // Each row's stable identity for keys, test ids and navigation. See
    // gridRowKey: a named row uses its name, a nameless one its tree path.
    const rowKeys = rows.map((row, index) => gridRowKey(gridPath, row, rowRawIndices[index]));

    const rowCells = rows.map((row) => cellFields(row, excludeName));

    // Math.max of an empty list is -Infinity; guard it. A grid with no rows, or
    // whose only rows have no cells, has no columns to lay out — rendering the
    // header would read columns[0] off an empty array and crash the form. Fall
    // back to the full field renderer so a misconfigured form still shows its
    // fields (and their errors) rather than blowing up.
    const columnCount = rowCells.length ? Math.max(...rowCells.map((cells) => cells.length)) : 0;

    if (columnCount === 0) {
        return <>{children.map((child) => renderField(child))}</>;
    }

    // A heading comes from the first row that actually has a cell in that
    // position, which is the first row unless that row is short. Keying on the
    // cell name rather than the label keeps two columns that share a label
    // from colliding.
    const columns = Array.from({length: columnCount}, (_, columnIndex) => {
        const source = rowCells.find((cells) => cells[columnIndex])?.[columnIndex];

        // An action_button carries its own label on the button itself, so its
        // column header is left blank to avoid repeating the word in both places.
        const isActionButton = source?.type === AppFieldTypes.ACTION_BUTTON;
        return {
            label: (source && !isActionButton) ? (source.label || source.name || '') : '',
            key: source ? source.name : `column-${columnIndex}`,
        };
    });

    const rowHasError = rowCells.map((cells) => cells.some((cell) => cell.name && Boolean(secureGetFromRecord(errors, cell.name))));

    // A row with an error reserves room below its inputs for the message.
    const rowHeights = rowHasError.map((hasError) => CELL_HEIGHT + (hasError ? ERROR_HEIGHT : 0));

    const renderCellAt = (rowIndex: number, columnIndex: number, width: number) => {
        const cell = rowCells[rowIndex][columnIndex];
        const key = `${rowKeys[rowIndex]}-${columns[columnIndex].key}`;
        const error = cell?.name ? secureGetFromRecord(errors, cell.name) : undefined;
        const isSticky = columnIndex === 0;
        const testID = cell?.name ? `apps_form_grid.cell.${cell.name}` : undefined;

        const errorNode = Boolean(error) && (
            <Text
                style={style.cellError}
                numberOfLines={2}
                testID={`${testID}.error`}
            >
                {error}
            </Text>
        );

        // A cell compact enough to fit the row edits in place. A taller control
        // (radio, date, file, a nested section) shows a one-line summary of its
        // value instead and is edited on the row's own screen, which has room.
        const inline = Boolean(cell) && rendersInlineInCell(cell);

        if (!inline) {
            const text = cell?.name ? displayCellValue(cell, secureGetFromRecord(values, cell.name)) : '';
            return (
                <View
                    key={key}
                    style={[
                        style.cell,
                        style.summaryCell,
                        {
                            width,
                            height: rowHeights[rowIndex],
                            paddingBottom: rowHasError[rowIndex] ? ERROR_HEIGHT : 0,
                        },
                        isSticky && rowHasError[rowIndex] && style.errorMark,
                    ]}
                    accessibilityLabel={cell?.label}
                    testID={testID}
                >
                    <Text
                        style={[style.summaryText, !text && style.summaryEmpty, Boolean(error) && style.summaryInvalid]}
                        numberOfLines={1}
                    >
                        {text || '—'}
                    </Text>
                    {errorNode}
                </View>
            );
        }

        // The row is opened from its own expand column (see renderExpandCell),
        // so no cell carries an open control.
        return (
            <View
                key={key}
                style={[
                    style.cell,
                    {
                        width,
                        height: rowHeights[rowIndex],
                        paddingBottom: rowHasError[rowIndex] ? ERROR_HEIGHT : 0,
                    },
                    isSticky && rowHasError[rowIndex] && style.errorMark,
                ]}
                accessibilityLabel={cell?.label}
                testID={testID}
            >
                {Boolean(cell) && (
                    <View style={[style.cellInput, cell.type === AppFieldTypes.TEXT && style.cellTextInput]}>
                        {renderCell(cell)}
                    </View>
                )}
                {errorNode}
            </View>
        );
    };

    // The expand control sits in its own narrow frozen column so it never
    // crowds the first cell's value. The whole cell is the tap target.
    const renderExpandCell = (rowIndex: number) => (
        <Pressable
            key={`expand-${rowKeys[rowIndex]}`}
            onPress={() => onOpenRow?.(rowKeys[rowIndex])}
            accessibilityRole='button'
            accessibilityLabel={rows[rowIndex].label || rows[rowIndex].name || intl.formatMessage(messages.openRow, {number: rowIndex + 1})}
            style={({pressed}: PressableStateCallbackType) => [
                style.cell,
                style.expandCell,
                {width: EXPAND_COLUMN_WIDTH, height: rowHeights[rowIndex], paddingBottom: rowHasError[rowIndex] ? ERROR_HEIGHT : 0},
                pressed && style.expandCellPressed,
            ]}
            testID={`apps_form_grid.row.${rowKeys[rowIndex]}.open`}
        >
            <CompassIcon
                name='arrow-expand'
                size={16}
                style={style.expandIcon}
            />
        </Pressable>
    );

    const expandHeaderCell = () => (
        <View style={[style.headerCell, style.expandCell, {width: EXPAND_COLUMN_WIDTH, height: HEADER_HEIGHT}]}/>
    );

    // Cells edit in place and the row opens from its own expand column, so a
    // row is just a layout container, not a press target.
    const renderRow = (rowIndex: number, content: React.ReactNode) => (
        <View
            key={rowKeys[rowIndex]}
            style={style.row}
        >
            {content}
        </View>
    );

    const headerCell = (columnIndex: number, width: number) => (
        <View
            key={columns[columnIndex].key}
            style={[style.headerCell, {width, height: HEADER_HEIGHT}]}
            testID={`apps_form_grid.header.${columns[columnIndex].key}`}
        >
            <Text
                style={style.headerText}
                numberOfLines={1}
            >
                {columns[columnIndex].label}
            </Text>
        </View>
    );

    const scrollingColumns = columns.map((_, columnIndex) => columnIndex).slice(1);

    return (
        <View
            style={style.container}
            testID={`apps_form_grid.${field.name}`}
        >
            <View style={style.table}>
                <View
                    style={style.stickyColumn}
                    testID='apps_form_grid.sticky_column'
                >
                    <View style={style.headerRow}>
                        {headerCell(0, STICKY_COLUMN_WIDTH)}
                        {expandHeaderCell()}
                    </View>
                    {rows.map((_, rowIndex) => renderRow(rowIndex, (
                        <>
                            {renderCellAt(rowIndex, 0, STICKY_COLUMN_WIDTH)}
                            {renderExpandCell(rowIndex)}
                        </>
                    )))}
                </View>
                <ScrollView
                    horizontal={true}
                    showsHorizontalScrollIndicator={true}
                    style={style.scroll}

                    // The cells hold inputs and selects; without this a tap
                    // that starts on one is swallowed by the scroll view.
                    keyboardShouldPersistTaps='handled'
                    testID='apps_form_grid.scroll'
                >
                    <View>
                        <View style={style.headerRow}>
                            {scrollingColumns.map((columnIndex) => headerCell(columnIndex, COLUMN_WIDTH))}
                        </View>
                        {rows.map((_, rowIndex) => renderRow(
                            rowIndex,
                            scrollingColumns.map((columnIndex) => renderCellAt(rowIndex, columnIndex, COLUMN_WIDTH)),
                        ))}
                    </View>
                </ScrollView>
            </View>
            {strays.map((child) => renderField(child))}
        </View>
    );
};

export default AppsFormGrid;
