// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import PropTypes from 'prop-types';
import React from 'react';
import {Text} from 'react-native';

import CustomPropTypes from 'app/constants/custom_prop_types';

export default class Hashtag extends React.PureComponent {
    static propTypes = {
        hashtag: PropTypes.string.isRequired,
        linkStyle: CustomPropTypes.Style.isRequired,
        onHashtagPress: PropTypes.func,
        navigator: PropTypes.object.isRequired,
        actions: PropTypes.shape({
            showSearchModal: PropTypes.func.isRequired,
        }).isRequired,
    };

    handlePress = () => {
        if (this.props.onHashtagPress) {
            this.props.onHashtagPress(this.props.hashtag);

            return;
        }

        // Close thread view, permalink view, etc
        this.props.navigator.dismissAllModals();
        this.props.navigator.popToRoot();

        this.props.actions.showSearchModal(this.props.navigator, '#' + this.props.hashtag);
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
