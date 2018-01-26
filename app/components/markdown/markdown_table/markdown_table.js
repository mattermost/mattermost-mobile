// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {PropTypes} from 'prop-types';
import React from 'react';
import {injectIntl, intlShape} from 'react-intl';
import {
    Clipboard,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

import CustomPropTypes from 'app/constants/custom_prop_types';
import FormattedText from 'app/components/formatted_text';
import {getDisplayNameForLanguage} from 'app/utils/markdown';
import {wrapWithPreventDoubleTap} from 'app/utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';
import mattermostManaged from 'app/mattermost_managed';

class MarkdownTable extends React.PureComponent {
    static propTypes = {
        children: PropTypes.node,
        intl: intlShape.isRequired,
        navigator: PropTypes.object.isRequired,
        theme: PropTypes.object.isRequired,
        maxRows: PropTypes.number,
        // content: PropTypes.string.isRequired,
        textStyle: CustomPropTypes.Style,
        onLongPress: PropTypes.func.isRequired
    };

    static defaultProps = {
    };

    handlePress = wrapWithPreventDoubleTap(() => {
        // const {intl, navigator, theme} = this.props;

        // navigator.push({
        //     screen: 'Code',
        //     title: intl.formatMessage({
        //         id: 'mobile.routes.code.noLanguage',
        //         defaultMessage: 'Code'
        //     }),
        //     animated: true,
        //     backButtonTitle: '',
        //     passProps: {
        //         content: this.props.content
        //     },
        //     navigatorStyle: {
        //         navBarTextColor: theme.sidebarHeaderTextColor,
        //         navBarBackgroundColor: theme.sidebarHeaderBg,
        //         navBarButtonColor: theme.sidebarHeaderTextColor,
        //         screenBackgroundColor: theme.centerChannelBg
        //     }
        // });
    });

    handleLongPress = async () => {
        if (!this.props.handleLongPress) {
            return;
        }
        // const {formatMessage} = this.props.intl;

        // const config = await mattermostManaged.getLocalConfig();

        // let action;
        // if (config.copyAndPasteProtection !== 'true') {
        //     action = {
        //         text: formatMessage({id: 'mobile.markdown.code.copy_code', defaultMessage: 'Copy Code'}),
        //         onPress: this.handleCopyCode
        //     };
        // }

        // this.props.onLongPress(action);
    }

    // handleCopyCode = () => {
    //     Clipboard.setString(this.props.content);
    // }

    render() {
        const style = getStyleSheet(this.props.theme);

        let rows;
        if (this.props.maxRows && this.props.children.length > this.props.maxRows) {
            rows = this.props.children.slice(0, this.props.maxRows);
        } else {
            rows = this.props.children;
        }

        return (
            <TouchableOpacity
                onPress={this.handlePress}
                onLongPress={this.handleLongPress}
            >
                <View style={style.table}>
                    {rows}
                </View>
            </TouchableOpacity>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        table: {
            borderColor: changeOpacity(theme.centerChannelColor, 0.2),
            borderTopWidth: 1,
            borderLeftWidth: 1
        }
    };
});

export default injectIntl(MarkdownTable);
