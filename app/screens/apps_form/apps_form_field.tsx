// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import AutocompleteSelector from '@components/autocomplete_selector';
import BoolSetting from '@components/widgets/settings/bool_setting';
import TextSetting from '@components/widgets/settings/text_setting';
import {ViewTypes} from '@constants/index';
import {AppField, AppSelectOption} from '@mm-redux/types/apps';
import {Theme} from '@mm-redux/types/preferences';
import React from 'react';

import AppsFormSelectField from './apps_form_select_field';

const TEXT_DEFAULT_MAX_LENGTH = 150;
const TEXTAREA_DEFAULT_MAX_LENGTH = 3000;

export type Props = {
    field: AppField;
    name: string;
    errorText?: React.ReactNode;
    theme: Theme;

    value: AppSelectOption | string | boolean | null;
    onChange: (name: string, value: string | AppSelectOption) => void;
    performLookup: (name: string, userInput: string) => Promise<AppSelectOption[]>;
}

type Option = {
    text: string;
    value: string;
}

export default class AppsFormField extends React.PureComponent<Props> {
    handleSelected = (selected: AppSelectOption | Option) => {
        const {name, field, onChange} = this.props;

        if (field.type === 'user' || field.type === 'channel') {
            const option = selected as Option;
            onChange(name, {label: option.text, value: option.value});
        } else {
            const option = selected as AppSelectOption;
            onChange(name, option);
        }
    }

    render() {
        const {
            field,
            name,
            value,
            onChange,
            errorText,
            theme,
        } = this.props;

        const placeholder = field.hint || '';
        const displayName = (field.modal_label || field.label) as string;

        if (field.type === 'text') {
            let keyboardType = 'default';
            let multiline = false;
            let secureTextEntry = false;

            const subtype = field.subtype || 'text';

            let maxLength = field.max_length;
            if (!maxLength) {
                if (subtype === 'textarea') {
                    maxLength = TEXTAREA_DEFAULT_MAX_LENGTH;
                } else {
                    maxLength = TEXT_DEFAULT_MAX_LENGTH;
                }
            }

            let textType = 'input';
            if (subtype && TextSetting.validTypes.includes(subtype)) {
                textType = subtype;
            }

            switch (textType) {
            case 'email':
                keyboardType = 'email-address';
                break;
            case 'number':
                keyboardType = 'numeric';
                break;
            case 'tel':
                keyboardType = 'phone-pad';
                break;
            case 'url':
                keyboardType = 'url';
                break;
            case 'password':
                secureTextEntry = true;
                break;
            case 'textarea':
                multiline = true;
                break;
            }

            const textValue = value as string;
            return (
                <TextSetting
                    id={name}
                    label={displayName}
                    maxLength={maxLength}
                    value={textValue || ''}
                    placeholder={placeholder}
                    helpText={field.description}
                    errorText={errorText}
                    onChange={onChange}
                    optional={!field.is_required}
                    showRequiredAsterisk={true}
                    resizable={false}
                    theme={theme}
                    multiline={multiline}
                    keyboardType={keyboardType}
                    secureTextEntry={secureTextEntry}
                    disabled={field.readonly}
                />
            );
        } else if (field.type === 'channel' || field.type === 'user') {
            let dataSource = ViewTypes.DATA_SOURCE_CHANNELS;
            if (field.type === 'user') {
                dataSource = ViewTypes.DATA_SOURCE_USERS;
            }
            return (
                <AutocompleteSelector
                    id={name}
                    label={displayName}
                    dataSource={dataSource}
                    optional={!field.is_required}
                    onSelected={this.handleSelected}
                    helpText={field.description}
                    errorText={errorText}
                    placeholder={placeholder}
                    showRequiredAsterisk={true}
                    selected={value}
                    roundedBorders={false}
                    disabled={field.readonly}
                />
            );
        } else if (field.type === 'static_select' || field.type === 'dynamic_select') {
            const selectedOption = value as (AppSelectOption | null);
            return (
                <AppsFormSelectField
                    field={field}
                    label={displayName}
                    helpText={field.description}
                    onChange={this.handleSelected}
                    errorText={errorText}
                    performLookup={this.props.performLookup}
                    value={selectedOption}
                />
            );
        } else if (field.type === 'bool') {
            const boolValue = value as boolean;
            return (
                <BoolSetting
                    id={name}
                    label={displayName}
                    value={boolValue || false}
                    placeholder={placeholder}
                    helpText={field.description}
                    errorText={errorText}
                    optional={!field.is_required}
                    theme={theme}
                    onChange={onChange}
                    disabled={field.readonly}
                />
            );
        }

        return null;
    }
}
