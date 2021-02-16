// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import AutocompleteSelector from '@components/autocomplete_selector';
import {AppField, AppSelectOption} from '@mm-redux/types/apps';
import React from 'react';

export type Props = {
    field: AppField;
    label: React.ReactNode;
    helpText: React.ReactNode;
    errorText?: React.ReactNode;
    value: AppSelectOption | null;
    onChange: (value: AppSelectOption) => void;
    performLookup: (name: string, userInput: string) => Promise<AppSelectOption[]>;
};

type Option = {
    text: string;
    value: string;
}

export default class AppsFormSelectField extends React.PureComponent<Props> {
    onChange = (selectedOption: Option) => {
        this.props.onChange({label: selectedOption.text, value: selectedOption.value});
    }

    loadDynamicOptions = async (userInput: string): Promise<AppSelectOption[]> => {
        return this.props.performLookup(this.props.field.name, userInput);
    }

    // renderDynamicSelect() {
    //     const {field} = this.props;
    //     const placeholder = field.hint || '';
    //     const value = this.props.value || [];

    //     return (
    //         <div className='form-group'>
    //             <AsyncSelect
    //                 id={`MultiInput_${field.name}`}
    //                 loadOptions={this.loadDynamicOptions}
    //                 defaultOptions={true}
    //                 isMulti={field.multiselect || false}
    //                 isClearable={true}
    //                 openMenuOnFocus={false}
    //                 placeholder={placeholder}
    //                 value={value}
    //                 onChange={this.onChange as any} // types are not working correctly for multiselect
    //                 classNamePrefix='react-select-auto react-select'
    //             />
    //         </div>
    //     );
    // }

    renderStaticSelect() {
        const {field, label, helpText, errorText, onChange} = this.props;

        const placeholder = field.hint || '';

        const options = field.options?.map((v) => {
            return {text: v.label, value: v.value};
        }) || [];
        const value = options.find((v) => {
            return v.value === this.props.value?.value;
        }) || {};

        return (
            <AutocompleteSelector
                id={`MultiInput_${field.name}`}
                label={label}
                options={options}
                optional={!field.is_required}
                onSelected={onChange}
                helpText={helpText}
                errorText={errorText}
                placeholder={placeholder}
                showRequiredAsterisk={true}
                selected={value}
                roundedBorders={false}
            />
        );
    }

    render() {
        const {field} = this.props;

        let selectComponent;
        if (field.type === 'dynamic_select') {
            //selectComponent = this.renderDynamicSelect();
            return null;
        } else if (field.type === 'static_select') {
            selectComponent = this.renderStaticSelect();
        } else {
            return null;
        }

        return selectComponent;
    }
}
