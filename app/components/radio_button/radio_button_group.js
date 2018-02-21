// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {View} from 'react-native';
import RadioButton from './radio_button';

export default class RadioButtonGroup extends PureComponent {
    static propTypes = {
        options: PropTypes.array,
        name: PropTypes.string.isRequired,
        onSelect: PropTypes.func,
    };

    static defaultProps: {
        options: []
    };

    state = {};

    constructor(props) {
        super(props);

        this.selected = null;
        if (this.props.options.length) {
            this.props.options.forEach((option) => {
                const {
                    value,
                    checked,
                } = option;

                if (!this.state.selected && checked) {
                    this.selected = value;
                }
            });
        }

        this.state = {selected: this.selected};
    }

    get value() {
        return this.state.selected;
    }

    set value(value) {
        this.onChange(value);
    }

    onChange = (value) => {
        const {onSelect} = this.props;
        this.setState({
            selected: value,
        }, () => {
            if (onSelect) {
                onSelect(value);
            }
        });
    };

    render = () => {
        let options;
        if (this.props.options.length) {
            options = this.props.options.map((option) => {
                const {
                    value,
                    label,
                    disabled,
                    ...other
                } = option;

                const {name} = this.props;

                return (
                    <RadioButton
                        {...other}
                        ref={value}
                        name={name}
                        key={`${name}-${value}`}
                        value={value}
                        label={label}
                        disabled={disabled}
                        onCheck={this.onChange}
                        checked={this.state.selected && value === this.state.selected}
                    />
                );
            });
        }

        return (
            <View>
                {options}
            </View>
        );
    };
}
