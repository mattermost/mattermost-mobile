// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PropTypes} from 'react';
import {
    StyleSheet,
    View
} from 'react-native';

import FormattedText from 'app/components/formatted_text';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return StyleSheet.create({
        container: {
            marginTop: 30
        },
        footer: {
            marginHorizontal: 15,
            marginTop: 10,
            fontSize: 12,
            color: changeOpacity(theme.centerChannelColor, 0.5)
        },
        header: {
            marginHorizontal: 15,
            marginBottom: 10,
            fontSize: 13,
            color: theme.centerChannelColor
        },
        items: {
            backgroundColor: theme.centerChannelBg,
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderTopColor: changeOpacity(theme.centerChannelColor, 0.1),
            borderBottomColor: changeOpacity(theme.centerChannelColor, 0.1)
        }
    });
});

function section(props) {
    const {
        children,
        disableFooter,
        footerDefaultMessage,
        footerId,
        footerValues,
        headerDefaultMessage,
        headerId,
        headerValues,
        theme
    } = props;

    const style = getStyleSheet(theme);

    return (
        <View style={style.container}>
            <FormattedText
                id={headerId}
                defaultMessage={headerDefaultMessage}
                values={headerValues}
                style={style.header}
            />
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
    disableFooter: PropTypes.bool,
    footerDefaultMessage: PropTypes.string,
    footerId: PropTypes.string,
    footerValues: PropTypes.object,
    headerDefaultMessage: PropTypes.string.isRequired,
    headerId: PropTypes.string.isRequired,
    headerValues: PropTypes.object,
    theme: PropTypes.object.isRequired
};

export default section;
