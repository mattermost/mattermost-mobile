// Copyright (c) 2018-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {PropTypes} from 'prop-types';
import React from 'react';
import {intlShape} from 'react-intl';
import {Text} from 'react-native';

import CustomPropTypes from 'app/constants/custom_prop_types';
import {preventDoubleTap} from 'app/utils/tap';

export default class MarkdownTableImage extends React.PureComponent {
    static propTypes = {
        children: PropTypes.node.isRequired,
        source: PropTypes.string.isRequired,
        textStyle: CustomPropTypes.Style.isRequired,
        navigator: PropTypes.object.isRequired,
        serverURL: PropTypes.string.isRequired,
        theme: PropTypes.object.isRequired,
    };

    static contextTypes = {
        intl: intlShape.isRequired,
    };

    handlePress = preventDoubleTap(() => {
        const {navigator, theme} = this.props;

        navigator.push({
            screen: 'TableImage',
            title: this.context.intl.formatMessage({
                id: 'mobile.routes.tableImage',
                defaultMessage: 'Image',
            }),
            animated: true,
            backButtonTitle: '',
            passProps: {
                imageSource: this.getImageSource(),
            },
            navigatorStyle: {
                navBarTextColor: theme.sidebarHeaderTextColor,
                navBarBackgroundColor: theme.sidebarHeaderBg,
                navBarButtonColor: theme.sidebarHeaderTextColor,
                screenBackgroundColor: theme.centerChannelBg,
            },
        });
    });

    getImageSource = () => {
        let source = this.props.source;

        if (source.startsWith('/')) {
            source = `${this.props.serverURL}/${source}`;
        }

        return source;
    };

    render() {
        return (
            <Text
                onPress={this.handlePress}
                style={this.props.textStyle}
            >
                {this.props.children}
            </Text>
        );
    }
}
