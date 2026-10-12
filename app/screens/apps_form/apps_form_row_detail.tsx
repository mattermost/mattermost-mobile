// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {Pressable, type PressableStateCallbackType, Text, View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type Props = {

    // The row being edited: a collapsible whose children are its cells.
    row: AppField;

    // What names this row. The grid's first column is the row's identity, so
    // this is normally the live value of its first cell.
    title: string;

    // Renders one leaf field the way the form renders any other — label, help
    // text and its own error. A row's screen has the width for all three,
    // which is the point of having one.
    renderField: (field: AppField) => React.ReactNode;

    onBack: () => void;
    excludeName?: string;
};

const getStyleFromTheme = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        header: {
            alignItems: 'center',
            borderBottomColor: changeOpacity(theme.centerChannelColor, 0.12),
            borderBottomWidth: 1,
            flexDirection: 'row',
            gap: 4,
            paddingBottom: 10,
            paddingHorizontal: 15,
            paddingTop: 4,
        },
        headerPressed: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.04),
        },
        back: {
            color: theme.linkColor,
        },
        backText: {
            color: theme.linkColor,
            ...typography('Body', 100),
        },
        title: {
            color: theme.centerChannelColor,
            flexShrink: 1,
            marginLeft: 4,
            ...typography('Heading', 100),
        },
    };
});

/**
 * One row of a grid, edited on its own. The table it came from is for reading:
 * it shows every row at once but gives each field a fraction of a narrow
 * screen. Here a single row has the whole width, so the fields keep their
 * labels, their help text and room for a server's error message, and the
 * keyboard only ever has to make way for one of them.
 *
 * Nothing is saved or submitted from here. The fields write to the same form
 * values the table reads, so going back simply shows the table with what was
 * typed already in it, and the dialog is still submitted as a whole.
 */
const AppsFormRowDetail = ({row, title, renderField, onBack, excludeName}: Props) => {
    const theme = useTheme();
    const style = getStyleFromTheme(theme);

    const fields = useMemo(
        () => (row.collapsible_config?.fields || []).filter((f) => f.name && f.name !== excludeName),
        [row, excludeName],
    );

    const headerStyle = useCallback(({pressed}: PressableStateCallbackType) => [
        style.header,
        pressed && style.headerPressed,
    ], [style.header, style.headerPressed]);

    return (
        <View testID={`apps_form_row_detail.${row.name}`}>
            <Pressable
                onPress={onBack}
                accessibilityRole='button'
                style={headerStyle}
                testID='apps_form_row_detail.back'
            >
                <CompassIcon
                    name='chevron-left'
                    size={20}
                    style={style.back}
                />
                <FormattedText
                    id='interactive_dialog.grid.back_to_table'
                    defaultMessage='Table'
                    style={style.backText}
                />
                <Text
                    style={style.title}
                    numberOfLines={1}
                    testID='apps_form_row_detail.title'
                >
                    {title}
                </Text>
            </Pressable>
            {fields.map((f) => renderField(f))}
        </View>
    );
};

export default AppsFormRowDetail;
