// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';
import PropTypes from 'prop-types';
import {
    View,
} from 'react-native';

import FormattedText from 'app/components/formatted_text';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

function section(props) {
    const {
        children,
        disableHeader,
        disableFooter,
        footerDefaultMessage,
        footerId,
        footerValues,
        headerDefaultMessage,
        headerId,
        headerValues,
        theme,
    } = props;

    const style = getStyleSheet(theme);

    return (
        <View style={style.container}>
            {(headerId && !disableHeader) &&
                <FormattedText
                    id={headerId}
                    defaultMessage={headerDefaultMessage}
                    values={headerValues}
                    style={style.header}
                />
            }
            <View style={style.items}>
                {children}
            </View>
            {(footerId && !disableFooter) &&
                <FormattedText
                    id={footerId}
                    defaultMessage={footerDefaultMessage}
                    values={footerValues}
                    style={style.footer}
                />
            }
        </View>
    );
}

section.propTypes = {
    children: PropTypes.node.isRequired,
    disableHeader: PropTypes.bool,
    disableFooter: PropTypes.bool,
    footerDefaultMessage: PropTypes.string,
    footerId: PropTypes.string,
    footerValues: PropTypes.object,
    headerDefaultMessage: PropTypes.string,
    headerId: PropTypes.string,
    headerValues: PropTypes.object,
    theme: PropTypes.object.isRequired,
};

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            marginBottom: 30,
        },
        header: {
            marginHorizontal: 15,
            marginBottom: 10,
            fontSize: 13,
            color: changeOpacity(theme.centerChannelColor, 0.5),
        },
        items: {
            backgroundColor: theme.centerChannelBg,
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderTopColor: changeOpacity(theme.centerChannelColor, 0.1),
            borderBottomColor: changeOpacity(theme.centerChannelColor, 0.1),
        },
        footer: {
            marginHorizontal: 15,
            marginTop: 10,
            fontSize: 12,
            color: changeOpacity(theme.centerChannelColor, 0.5),
        },
    };
});

export default section;
