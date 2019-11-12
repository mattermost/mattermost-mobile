// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import PropTypes from 'prop-types';
import React from 'react';
import {Text} from 'react-native';

import CustomPropTypes from 'app/constants/custom_prop_types';
import {popToRoot, showSearchModal, dismissAllModals} from 'app/actions/navigation';

export default class Hashtag extends React.PureComponent {
    static propTypes = {
        hashtag: PropTypes.string.isRequired,
        linkStyle: CustomPropTypes.Style.isRequired,
        onHashtagPress: PropTypes.func,
    };

    handlePress = async () => {
        const {
            onHashtagPress,
            hashtag,
        } = this.props;

        if (onHashtagPress) {
            onHashtagPress(hashtag);

            return;
        }

        // Close thread view, permalink view, etc
        await dismissAllModals();
        await popToRoot();

        showSearchModal('#' + this.props.hashtag);
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
