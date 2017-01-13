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
    }

    render() {
        const {intl, placeholder, ...otherProps} = this.props;

        return (
            <TextInput
                ref='input'
                {...otherProps}
                placeholder={intl.formatMessage(placeholder)}
            />
        );
    }
}

export default injectIntl(TextInputWithLocalizedPlaceholder, {withRef: true});
