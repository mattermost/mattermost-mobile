// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {injectIntl, intlShape} from 'react-intl';
import {TextInput} from 'react-native';

class TextInputWithLocalizedPlaceholder extends PureComponent {
    static propTypes = {
        ...TextInput.propTypes,
        placeholder: PropTypes.object.isRequired,
        intl: intlShape.isRequired,
    };

    blur = () => {
        this.refs.input.blur();
    };

    focus = () => {
        this.refs.input.focus();
    };

    render() {
        const {intl, placeholder, ...otherProps} = this.props;
        let placeholderString = '';
        if (placeholder.id) {
            placeholderString = intl.formatMessage(placeholder);
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

export default injectIntl(TextInputWithLocalizedPlaceholder, {withRef: true});
