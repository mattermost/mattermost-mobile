// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {PropTypes} from 'prop-types';
import React from 'react';
import {intlShape} from 'react-intl';
import {Text} from 'react-native';

import CustomPropTypes from 'app/constants/custom_prop_types';
import {preventDoubleTap} from 'app/utils/tap';

export default class MarkdownTableImage extends React.PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            goToScreen: PropTypes.func.isRequired,
        }).isRequired,
        children: PropTypes.node.isRequired,
        source: PropTypes.string.isRequired,
        textStyle: CustomPropTypes.Style.isRequired,
        serverURL: PropTypes.string.isRequired,
        theme: PropTypes.object.isRequired,
    };

    static contextTypes = {
        intl: intlShape.isRequired,
    };

    handlePress = preventDoubleTap(() => {
        const {actions} = this.props;
        const {intl} = this.context;
        const screen = 'TableImage';
        const title = intl.formatMessage({
            id: 'mobile.routes.tableImage',
            defaultMessage: 'Image',
        });
        const passProps = {
            imageSource: this.getImageSource(),
        };

        actions.goToScreen(screen, title, passProps);
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
