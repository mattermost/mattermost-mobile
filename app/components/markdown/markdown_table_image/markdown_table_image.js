// Copyright (c) 2018-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {PropTypes} from 'prop-types';
import React from 'react';
import {injectIntl, intlShape} from 'react-intl';
import {Text} from 'react-native';

import CustomPropTypes from 'app/constants/custom_prop_types';
import {wrapWithPreventDoubleTap} from 'app/utils/tap';

// import mattermostManaged from 'app/mattermost_managed';

class MarkdownTableImage extends React.PureComponent {
    static propTypes = {
        children: PropTypes.node.isRequired,
        source: PropTypes.string.isRequired,
        textStyle: CustomPropTypes.Style.isRequired,
        onLongPress: PropTypes.func.isRequired,
        intl: intlShape.isRequired,
        navigator: PropTypes.object.isRequired,
        serverURL: PropTypes.string.isRequired,
        theme: PropTypes.object.isRequired
    };

    handlePress = wrapWithPreventDoubleTap(() => {
        const {intl, navigator, theme} = this.props;

        navigator.push({
            screen: 'TableImage',
            title: intl.formatMessage({
                id: 'mobile.routes.tableImage',
                defaultMessage: 'Image'
            }),
            animated: true,
            backButtonTitle: '',
            passProps: {
                imageSource: this.getImageSource()
            },
            navigatorStyle: {
                navBarTextColor: theme.sidebarHeaderTextColor,
                navBarBackgroundColor: theme.sidebarHeaderBg,
                navBarButtonColor: theme.sidebarHeaderTextColor,
                screenBackgroundColor: theme.centerChannelBg
            }
        });
    });

    handleLongPress = async () => {
        if (!this.props.onLongPress) {
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

    getImageSource = () => {
        let source = this.props.source;

        if (source.startsWith('/')) {
            source = this.props.serverURL + '/' + source;
        }

        return source;
    };

    render() {
        return (
            <Text
                onPress={this.handlePress}
                onLongPress={this.handleLongPress}
                style={this.props.textStyle}
            >
                {this.props.children}
            </Text>
        );
    }
}

export default injectIntl(MarkdownTableImage);
