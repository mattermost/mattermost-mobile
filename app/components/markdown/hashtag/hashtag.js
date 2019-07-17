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
        actions: PropTypes.shape({
            popToRoot: PropTypes.func.isRequired,
            showSearchModal: PropTypes.func.isRequired,
            dismissAllModals: PropTypes.func.isRequired,
        }).isRequired,
    };

    handlePress = () => {
        const {
            onHashtagPress,
            hashtag,
            actions,
        } = this.props;

        if (onHashtagPress) {
            onHashtagPress(hashtag);

            return;
        }

        // Close thread view, permalink view, etc
        actions.dismissAllModals();
        actions.popToRoot();

        actions.showSearchModal('#' + this.props.hashtag);
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
