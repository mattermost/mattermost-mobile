// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {Text} from 'react-native';

import CustomPropTypes from 'app/constants/custom_prop_types';
import FormattedText from 'app/components/formatted_text';
import {GlobalStyles} from 'app/styles';
import {makeStyleSheetFromTheme} from 'app/utils/theme';

export default class ErrorText extends PureComponent {
    static propTypes = {
        error: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
        textStyle: CustomPropTypes.Style,
        theme: PropTypes.object.isRequired,
    };

    render() {
        const {error, textStyle, theme} = this.props;
        if (!error) {
            return null;
        }

        const style = getStyleSheet(theme);

        const {intl} = error;
        if (intl) {
            return (
                <FormattedText
                    testID='error.text'
                    id={intl.id}
                    defaultMessage={intl.defaultMessage}
                    values={intl.values}
                    style={[GlobalStyles.errorLabel, style.errorLabel, textStyle]}
                />
            );
        }

        return (
            <Text
                testID='error.text'
                style={[GlobalStyles.errorLabel, style.errorLabel, textStyle]}
            >
                {error.message || error}
            </Text>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        errorLabel: {
            color: (theme.errorTextColor || '#DA4A4A'),
        },
    };
});
