// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {View} from 'react-native';
import RadioButton from './radio_button';

export default class RadioButtonGroup extends PureComponent {
    static propTypes = {
        children: PropTypes.node.isRequired,
        name: PropTypes.string.isRequired,
        value: PropTypes.string,
        onSelect: PropTypes.func
    };

    state = {};

    constructor(props) {
        super(props);

        if (props.value) {
            this.state = {
                selected: props.value
            };
        } else {
            React.Children.map(this.props.children, (option) => {
                if (option) {
                    const {
                        value,
                        checked
                    } = option.props;

                    if (!this.state.selected && checked) {
                        this.state = {
                            selected: value
                        };
                    }
                }
            });
        }
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
            selected: value
        }, () => {
            if (onSelect) {
                onSelect(value);
            }
        });
    };

    render = () => {
        const options = React.Children.map(this.props.children, (option) => {
            if (option) {
                const {
                    value,
                    label,
                    disabled,
                    ...other
                } = option.props;

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
            }

            return null;
        }, this);

        return (
            <View>
                {options}
            </View>
        );
    };
}
