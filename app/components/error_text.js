// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {connect} from 'react-redux';
import React, {PropTypes, PureComponent} from 'react';
import {StyleSheet, Text} from 'react-native';

import FormattedText from 'app/components/formatted_text';
import {getTheme} from 'app/selectors/preferences';
import {GlobalStyles} from 'app/styles';
import {makeStyleSheetFromTheme} from 'app/utils/theme';

class ErrorText extends PureComponent {
    static propTypes = {
        error: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
        theme: PropTypes.object
    };

    static defaultProps = {
        error: {},
        theme: {}
    };

    render() {
        const {error, theme} = this.props;
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
                    style={[GlobalStyles.errorLabel, style.errorLabel]}
                />
            );
        }

        return (
            <Text style={[GlobalStyles.errorLabel, style.errorLabel]}>
                {error.message || error}
            </Text>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return StyleSheet.create({
        errorLabel: {
            color: (theme.errorTextColor || '#DA4A4A')
        }
    });
});

function mapStateToProps(state, ownProps) {
    return {
        ...ownProps,
        theme: getTheme(state)
    };
}

export default connect(mapStateToProps)(ErrorText);
