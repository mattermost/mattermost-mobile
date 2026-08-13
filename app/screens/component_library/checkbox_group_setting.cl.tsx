// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useState} from 'react';
import {View} from 'react-native';

import CheckboxGroupSetting from '@components/settings/checkbox_group_setting';
import {Screens} from '@constants';

const DEMO_OPTIONS: DialogOption[] = [
    {text: 'Option 1', value: 'opt1'},
    {text: 'Option 2', value: 'opt2'},
    {text: 'Option 3', value: 'opt3'},
];

const CheckboxGroupSettingComponentLibrary = () => {
    const [beforeValue, setBeforeValue] = useState<string[]>([]);
    const [afterValue, setAfterValue] = useState<string[]>([]);
    const [requiredValue, setRequiredValue] = useState<string[]>([]);

    return (
        <View>
            <CheckboxGroupSetting
                label='Default label position (text first)'
                options={DEMO_OPTIONS}
                value={beforeValue}
                onChange={setBeforeValue}
                testID='checkboxGroup.cl.before'
                location={Screens.COMPONENT_LIBRARY}
                optional={true}
            />
            <CheckboxGroupSetting
                label='labelPosition="after" (control first)'
                options={DEMO_OPTIONS}
                value={afterValue}
                onChange={setAfterValue}
                testID='checkboxGroup.cl.after'
                location={Screens.COMPONENT_LIBRARY}
                labelPosition='after'
                optional={true}
            />
            <CheckboxGroupSetting
                label='Required (not optional)'
                options={DEMO_OPTIONS}
                value={requiredValue}
                onChange={setRequiredValue}
                testID='checkboxGroup.cl.required'
                location={Screens.COMPONENT_LIBRARY}
                optional={false}
            />
        </View>
    );
};

export default CheckboxGroupSettingComponentLibrary;
