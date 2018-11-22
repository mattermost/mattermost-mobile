// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';

import TextSetting from 'app/components/widgets/settings/text_setting';
import AutocompleteSelector from 'app/components/autocomplete_selector';

const TEXT_DEFAULT_MAX_LENGTH = 150;
const TEXTAREA_DEFAULT_MAX_LENGTH = 3000;

export default class DialogElement extends PureComponent {
    static propTypes = {
        displayName: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        type: PropTypes.string.isRequired,
        subtype: PropTypes.string,
        placeholder: PropTypes.string,
        helpText: PropTypes.string,
        errorText: PropTypes.node,
        maxLength: PropTypes.number,
        dataSource: PropTypes.string,
        optional: PropTypes.bool,
        options: PropTypes.arrayOf(PropTypes.object),
        value: PropTypes.any,
        onChange: PropTypes.func,
        navigator: PropTypes.object,
        theme: PropTypes.object,
    };

    constructor(props) {
        super(props);

        this.state = {
            selected: null,
        };
    }

    onChange = (name, value) => {
        const {type, subtype, onChange} = this.props;
        let newValue = value;
        if (type === 'text' && subtype === 'number') {
            newValue = parseInt(value, 10);
        }
        onChange(name, newValue);
    }

    handleAutocompleteSelect = (selected) => {
        if (!selected) {
            return;
        }

        this.setState({selected});

        const {name, onChange} = this.props;
        onChange(name, selected.value);
    }

    render() {
        const {
            name,
            type,
            subtype,
            displayName,
            value,
            placeholder,
            helpText,
            errorText,
            optional,
            theme,
            dataSource,
            options,
            navigator,
        } = this.props;

        let {maxLength} = this.props;

        if (type === 'text' || type === 'textarea') {
            let keyboardType = 'default';
            let multiline = false;
            if (type === 'text') {
                maxLength = maxLength || TEXT_DEFAULT_MAX_LENGTH;

                if (subtype === 'email') {
                    keyboardType = 'email-address';
                } else if (subtype === 'number') {
                    keyboardType = 'numeric';
                } else if (subtype === 'tel') {
                    keyboardType = 'phone-pad';
                } else if (subtype === 'url') {
                    keyboardType = 'url';
                }
            } else {
                multiline = true;
                maxLength = maxLength || TEXTAREA_DEFAULT_MAX_LENGTH;
            }

            return (
                <TextSetting
                    id={name}
                    label={displayName}
                    maxLength={maxLength}
                    value={String(value || '')}
                    placeholder={placeholder}
                    helpText={helpText}
                    errorText={errorText}
                    onChange={this.onChange}
                    optional={optional}
                    showRequiredAsterisk={true}
                    resizable={false}
                    theme={theme}
                    multiline={multiline}
                    keyboardType={keyboardType}
                />
            );
        } else if (type === 'select') {
            return (
                <AutocompleteSelector
                    id={name}
                    label={displayName}
                    dataSource={dataSource}
                    options={options}
                    optional={optional}
                    onSelected={this.handleAutocompleteSelect}
                    helpText={helpText}
                    errorText={errorText}
                    placeholder={placeholder}
                    showRequiredAsterisk={true}
                    selected={this.state.selected}
                    navigator={navigator}
                    roundedBorders={false}
                />
            );
        }

        return null;
    }
}