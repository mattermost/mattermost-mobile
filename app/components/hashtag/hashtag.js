// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import PropTypes from 'prop-types';
import React from 'react';
import {intlShape} from 'react-intl';
import {Text} from 'react-native';

import CustomPropTypes from 'app/constants/custom_prop_types';

export default class Hashtag extends React.PureComponent {
    static propTypes = {
        hashtag: PropTypes.string.isRequired,
        linkStyle: CustomPropTypes.Style,
        onHashtagPress: PropTypes.func,
        navigator: PropTypes.object.isRequired,
        theme: PropTypes.object.isRequired,
    };

    static contextTypes = {
        intl: intlShape,
    };

    handlePress = () => {
        if (this.props.onHashtagPress) {
            this.props.onHashtagPress(this.props.hashtag);
            return;
        }

        const options = {
            screen: 'Search',
            title: this.context.intl.formatMessage({id: 'mobile.routes.search', defaultMessage: 'Search'}),
            animated: true,
            backButtonTitle: '',
            passProps: {
                initialValue: '#' + this.props.hashtag,
            },
            navigatorStyle: {
                navBarTextColor: this.props.theme.sidebarHeaderTextColor,
                navBarBackgroundColor: this.props.theme.sidebarHeaderBg,
                navBarButtonColor: this.props.theme.sidebarHeaderTextColor,
                screenBackgroundColor: this.props.theme.centerChannelBg,
            },
        };

        // Close thread view, permalink view, etc
        this.props.navigator.dismissAllModals();
        this.props.navigator.popToRoot();

        this.props.navigator.showModal(options);
    };

    render() {
        return (
            <Text
                style={this.props.linkStyle}
                onPress={this.handlePress}
            >
                {`#${this.props.hashtag}`}
            </Text>
        );
    }
}
