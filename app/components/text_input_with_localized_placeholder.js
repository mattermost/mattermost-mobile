// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';
import {injectIntl, intlShape} from 'react-intl';
import {TextInput} from 'react-native';

class TextInputWithLocalizedPlaceholder extends React.PureComponent {
    static propTypes = {
        ...TextInput.propTypes,
        placeholder: React.PropTypes.object.isRequired,
        intl: intlShape.isRequired
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
            />
        );
    }
}

export default injectIntl(TextInputWithLocalizedPlaceholder, {withRef: true});
