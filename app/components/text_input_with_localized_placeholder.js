// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {intlShape} from 'react-intl';
import {TextInput} from 'react-native';

import {changeOpacity} from 'app/utils/theme';

export default class TextInputWithLocalizedPlaceholder extends PureComponent {
    static propTypes = {
        ...TextInput.propTypes,
        placeholder: PropTypes.object.isRequired,
    };

    static defaultProps = {
        placeholderTextColor: changeOpacity('#000', 0.5),
    };

    static contextTypes = {
        intl: intlShape.isRequired,
    };

    blur = () => {
        this.refs.input.blur();
    };

    focus = () => {
        this.refs.input.focus();
    };

    render() {
        const {formatMessage} = this.context.intl;
        const {placeholder, ...otherProps} = this.props;
        let placeholderString = '';
        if (placeholder.id) {
            placeholderString = formatMessage(placeholder);
        }

        return (
            <TextInput
                ref='input'
                {...otherProps}
                placeholder={placeholderString}
                disableFullscreenUI={true}
            />
        );
    }
}
