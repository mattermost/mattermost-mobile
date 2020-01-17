// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {Platform, View} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {makeStyleSheetFromTheme} from 'app/utils/theme';

import TouchableWithFeedback from 'app/components/touchable_with_feedback';

export default class FileUploadRemove extends PureComponent {
    static propTypes = {
        channelId: PropTypes.string,
        clientId: PropTypes.string,
        onPress: PropTypes.func.isRequired,
        rootId: PropTypes.string,
        theme: PropTypes.object.isRequired,
    };

    handleOnPress = () => {
        const {channelId, clientId, onPress, rootId} = this.props;

        onPress(clientId, channelId, rootId);
    };

    render() {
        const style = getStyleSheet(this.props.theme);
        return (
            <TouchableWithFeedback
                style={style.tappableContainer}
                onPress={this.handleOnPress}
                type={'opacity'}
            >
                <View style={style.removeButton}>
                    <Icon
                        name='close-circle'
                        color={this.props.theme.centerChannelColor}
                        size={20}
                    />
                </View>
            </TouchableWithFeedback>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        tappableContainer: {
            alignItems: 'center',
            justifyContent: 'center',
            position: 'absolute',
            elevation: 11,
            top: 4,
            right: 4,
            width: 35,
            height: 35,
        },
        removeButton: {
            width: 24,
            height: 24,
            borderRadius: 12,
            paddingTop: 2,
            backgroundColor: theme.centerChannelBg,
            ...Platform.select({
                ios: {
                    paddingLeft: 2,
                },
                android: {
                    paddingLeft: 1,
                },
            }),
        },
    };
});
