// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

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

    static defaultProps = {
        options: [],
    };

    constructor(props) {
        super(props);

        this.state = {
            selected: this.getSelectedValue(props.options),
        };
    }

    componentWillReceiveProps(nextProps) {
        if (this.props.options !== nextProps.options) {
            this.setState({selected: this.getSelectedValue(nextProps.options)});
        }
    }

    getSelectedValue = (options = []) => {
        let selected;
        for (const option in options) {
            if (option.checked) {
                selected = option.value;
                break;
            }
        }

        return selected;
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
                        checked={option.checked}
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
