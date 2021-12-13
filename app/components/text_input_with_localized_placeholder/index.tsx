// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useRef, forwardRef} from 'react';
import {useIntl} from 'react-intl';
import {TextInput, TextInputProps} from 'react-native';
import {changeOpacity} from '@utils/theme';

type Props = TextInputProps & {
    defaultMessage: string; 
    id: string; 
    values?: Record<string, any>;
};

const TextInputWithLocalizedPlaceholder = forwardRef((props: Props, ref) => {
    const intl = useIntl()
    const {placeholder, ...otherProps} = props;

    const {formatMessage} = intl;
    let placeholderString = '';
    if (placeholder?.id) {
        placeholderString = formatMessage(placeholder);
    }

    return (
        <TextInput
            ref={ref}
            disableFullscreenUI={true}
            placeholder={placeholderString}
            placeholderTextColor={changeOpacity('#000', 0.5)}
            {...otherProps}
        />
    );
})

export default TextInputWithLocalizedPlaceholder
