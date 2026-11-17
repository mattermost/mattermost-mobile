// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
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

    // Read here rather than inside a cell because a display cell shows the
    // value itself, and because the editing table sizes a row around its error.
    values: AppFormValues;
    errors: {[name: string]: string};

    // Names excluded from the grid (the form's submit buttons field).
    excludeName?: string;

    // True where there is room to type in the cells themselves. False on a
    // phone, where the cells show values and onOpenRow is called instead.
    editable: boolean;
    onOpenRow?: (rowKey: string) => void;
};

// A column is wide enough for a short value — an order number, a weight, a
// status — without making the table scroll further than it has to. The first
// column is narrower because it is always on screen and so is the one paying
// for the others' width.
const COLUMN_WIDTH = 150;
const STICKY_COLUMN_WIDTH = 124;

const HEADER_HEIGHT = 38;

// Tall enough for the 40pt input every settings component renders, plus a
// little room around it. The cell centres whatever it holds, so a select —
// which carries its own 10pt top margin — lines up with a text input beside it
// without the grid having to know the difference.
const CELL_HEIGHT = 46;

// A display cell holds one line of text, so it needs less.
const DISPLAY_CELL_HEIGHT = 44;

// Shown in place of a password value in the read-only overview.
const MASKED_VALUE = '••••••';

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
            borderRightColor: changeOpacity(theme.centerChannelColor, 0.16),
            borderRightWidth: 1,
        },
        row: {
            flexDirection: 'row',
        },
        rowPressed: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.04),
        },
        headerRow: {
            flexDirection: 'row',
        },
        headerCell: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.04),
            borderBottomColor: changeOpacity(theme.centerChannelColor, 0.12),
            borderBottomWidth: 1,
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

            // A select sizes itself to 100% of the cell and then adds its own
            // right margin, so it ends up a few points wider than the column.
            // Clipping here keeps it from drawing over the cell beside it;
            // without this the overhang lands on the next column's input and
            // its text reads as garbage.
            overflow: 'hidden',
        },

        // A display cell has no input to supply a rule, so it draws its own.
        //
        // justifyContent is reset because the base cell centres its content to
        // sit an input in the middle of the row. That is a vertical centring
        // there and a horizontal one here, where the direction is row, and a
        // column of values centred on itself does not read as a column.
        displayCell: {
            alignItems: 'center',
            borderBottomColor: changeOpacity(theme.centerChannelColor, 0.08),
            borderBottomWidth: 1,
            flexDirection: 'row',
            gap: 4,
            justifyContent: 'flex-start',
            paddingHorizontal: 12,
        },
        cellInput: {
            width: '100%',
        },
        cellError: {
            bottom: 4,
            color: theme.errorTextColor,
            left: 6,
            position: 'absolute',
            right: 6,
            ...typography('Body', 25),
        },
        value: {
            color: theme.centerChannelColor,
            flexShrink: 1,
            ...typography('Body', 100),
        },

        // An empty cell shows a dash rather than nothing, so a blank column
        // reads as "not filled in" instead of as a rendering fault.
        empty: {
            color: changeOpacity(theme.centerChannelColor, 0.4),
        },
        invalid: {
            color: theme.errorTextColor,
        },

        // The bar marks a row whose error may be in a column that is scrolled
        // out of sight. It is on the sticky cell because that is the part of
        // the row that is always visible.
        errorMark: {
            borderLeftColor: theme.errorTextColor,
            borderLeftWidth: 3,
        },
        chevron: {
            color: changeOpacity(theme.centerChannelColor, 0.32),
            marginLeft: 'auto',
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
 * What a cell shows when it is not being edited.
 *
 * Stringifying the value is not enough for most of the types a column can
 * hold: a select carries its label on the chosen option, a multiselect carries
 * a list of them, and a date is an ISO string that nobody wants to read across
 * a table. The row's own screen shows each of these in its real control; this
 * is only the summary in the overview.
 */
export function displayCellValue(field: AppField | undefined, value: AppFormValue | undefined): string {
    if (value === undefined || value === null || value === false || value === '') {
        return '';
    }

    // A password cell must never show its value in the read-only overview.
    // The row's own screen still edits it in a real secure input.
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

    // A select may carry a primitive value (e.g. a server default) rather than
    // a resolved option; show the matching option's label where there is one.
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
const AppsFormGrid = ({field, gridPath, renderCell, renderField, values, errors, excludeName, editable, onOpenRow}: Props) => {
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
        return {
            label: source ? (source.label || source.name || '') : '',
            key: source ? source.name : `column-${columnIndex}`,
        };
    });

    const rowHasError = rowCells.map((cells) => cells.some((cell) => cell.name && Boolean(secureGetFromRecord(errors, cell.name))));
    const baseHeight = editable ? CELL_HEIGHT : DISPLAY_CELL_HEIGHT;

    // A display cell has nowhere to put a message, so it does not reserve the
    // room for one; the row is marked instead and the message shows on the
    // row's own screen.
    const rowHeights = rowHasError.map((hasError) => baseHeight + (editable && hasError ? ERROR_HEIGHT : 0));

    const renderCellAt = (rowIndex: number, columnIndex: number, width: number) => {
        const cell = rowCells[rowIndex][columnIndex];
        const key = `${rowKeys[rowIndex]}-${columns[columnIndex].key}`;
        const error = cell?.name ? secureGetFromRecord(errors, cell.name) : undefined;
        const isSticky = columnIndex === 0;
        const testID = cell?.name ? `apps_form_grid.cell.${cell.name}` : undefined;

        if (!editable) {
            const text = cell?.name ? displayCellValue(cell, secureGetFromRecord(values, cell.name)) : '';
            const isBoolTrue = cell?.type === AppFieldTypes.BOOL && Boolean(cell.name && secureGetFromRecord(values, cell.name));

            return (
                <View
                    key={key}
                    style={[
                        style.cell,
                        style.displayCell,
                        {width, height: rowHeights[rowIndex]},
                        isSticky && rowHasError[rowIndex] && style.errorMark,
                    ]}
                    accessibilityLabel={cell?.label}
                    testID={testID}
                >
                    {isBoolTrue ? (
                        <CompassIcon
                            name='check'
                            size={18}
                            style={style.value}
                        />
                    ) : (
                        <Text
                            style={[style.value, !text && style.empty, Boolean(error) && style.invalid]}
                            numberOfLines={1}
                        >
                            {text || '—'}
                        </Text>
                    )}
                    {isSticky && (
                        <CompassIcon
                            name='chevron-right'
                            size={18}
                            style={style.chevron}
                        />
                    )}
                </View>
            );
        }

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
                ]}
                accessibilityLabel={cell?.label}
                testID={testID}
            >
                {Boolean(cell) && (
                    <View style={style.cellInput}>
                        {renderCell(cell)}
                    </View>
                )}
                {Boolean(error) && (
                    <Text
                        style={style.cellError}
                        numberOfLines={2}
                        testID={`${testID}.error`}
                    >
                        {error}
                    </Text>
                )}
            </View>
        );
    };

    // A row is split across the two panes, so each half is its own press
    // target; tapping the sticky cell and tapping a cell three columns along
    // open the same row. They are named apart because they are two nodes.
    const renderRow = (rowIndex: number, pane: 'sticky' | 'columns', content: React.ReactNode) => {
        const row = rows[rowIndex];
        const rowKey = rowKeys[rowIndex];

        if (editable) {
            return (
                <View
                    key={rowKey}
                    style={style.row}
                >
                    {content}
                </View>
            );
        }

        return (
            <Pressable
                key={rowKey}
                onPress={() => onOpenRow?.(rowKey)}
                accessibilityRole='button'
                accessibilityLabel={row.label || row.name}
                style={({pressed}: PressableStateCallbackType) => [style.row, pressed && style.rowPressed]}
                testID={`apps_form_grid.row.${rowKey}.${pane}`}
            >
                {content}
            </Pressable>
        );
    };

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
                    {headerCell(0, STICKY_COLUMN_WIDTH)}
                    {rows.map((_, rowIndex) => renderRow(rowIndex, 'sticky', renderCellAt(rowIndex, 0, STICKY_COLUMN_WIDTH)))}
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
                            'columns',
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
