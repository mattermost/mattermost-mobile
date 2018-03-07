// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {connect} from 'react-redux';
import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {Text} from 'react-native';

import CustomPropTypes from 'app/constants/custom_prop_types';
import FormattedText from 'app/components/formatted_text';
import {getTheme} from 'mattermost-redux/selectors/entities/preferences';
import {GlobalStyles} from 'app/styles';
import {makeStyleSheetFromTheme} from 'app/utils/theme';

class ErrorText extends PureComponent {
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

        if (error.hasOwnProperty('intl')) {
            const {intl} = error;
            return (
                <FormattedText
                    id={intl.id}
                    defaultMessage={intl.defaultMessage}
                    values={intl.values}
                    style={[GlobalStyles.errorLabel, style.errorLabel, textStyle]}
                />
            );
        }

        return (
            <Text style={[GlobalStyles.errorLabel, style.errorLabel, textStyle]}>
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

function mapStateToProps(state, ownProps) {
    return {
        ...ownProps,
        theme: getTheme(state),
    };
}

export default connect(mapStateToProps)(ErrorText);
