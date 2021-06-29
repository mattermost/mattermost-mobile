// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import PropTypes from 'prop-types';
import React from 'react';
import {Text} from 'react-native';

import {popToRoot, showSearchModal, dismissAllModals} from '@actions/navigation';

export default class Hashtag extends React.PureComponent {
    static propTypes = {
        hashtag: PropTypes.string.isRequired,
        linkStyle: PropTypes.oneOfType([PropTypes.object, PropTypes.number, PropTypes.array]),
    };

    handlePress = async () => {
        const {hashtag} = this.props;

        // Close thread view, permalink view, etc
        await dismissAllModals();
        await popToRoot();

        showSearchModal('#' + hashtag);
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
