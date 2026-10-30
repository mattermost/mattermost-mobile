// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useState} from 'react';
import {View} from 'react-native';

import CheckboxMatrixSetting from '@components/settings/checkbox_matrix_setting';
import {Screens} from '@constants';

const MULTIPLE_MATRIX_CONFIG = {
    rows: [
        {label: 'Row 1', value: 'row1'},
        {label: 'Row 2', value: 'row2'},
        {label: 'Row 3', value: 'row3'},
        {label: 'Row 4', value: 'row4'},
    ],
    columns: [
        {label: 'Column 1', value: 'col1'},
        {label: 'Column 2', value: 'col2'},
        {label: 'Column 3', value: 'col3'},
        {label: 'Column 4', value: 'col4'},
        {label: 'Column 5', value: 'col5'},
        {label: 'Column 6', value: 'col6'},
    ],
    row_selection: 'multiple' as const,
};

const SINGLE_MATRIX_CONFIG = {
    rows: [
        {label: 'Row A', value: 'rowA'},
        {label: 'Row B', value: 'rowB'},
        {label: 'Row C', value: 'rowC'},
    ],
    columns: [
        {label: 'Low', value: 'low'},
        {label: 'Medium', value: 'medium'},
        {label: 'High', value: 'high'},
    ],
    row_selection: 'single' as const,
};

const CheckboxMatrixSettingComponentLibrary = () => {
    const [multipleValue, setMultipleValue] = useState<string[]>([]);
    const [singleValue, setSingleValue] = useState<string[]>([]);

    return (
        <View>
            <CheckboxMatrixSetting
                id='checkboxMatrix.cl.multiple'
                label='row_selection="multiple" (4 rows x 6 columns)'
                matrixConfig={MULTIPLE_MATRIX_CONFIG}
                value={multipleValue}
                onChange={setMultipleValue}
                testID='checkboxMatrix.cl.multiple'
                location={Screens.COMPONENT_LIBRARY}
                optional={true}
            />
            <CheckboxMatrixSetting
                id='checkboxMatrix.cl.single'
                label='row_selection="single" (3 rows x 3 columns)'
                matrixConfig={SINGLE_MATRIX_CONFIG}
                value={singleValue}
                onChange={setSingleValue}
                testID='checkboxMatrix.cl.single'
                location={Screens.COMPONENT_LIBRARY}
                optional={true}
            />
        </View>
    );
};

export default CheckboxMatrixSettingComponentLibrary;
