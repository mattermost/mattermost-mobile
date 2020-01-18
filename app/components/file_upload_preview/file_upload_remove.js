// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {View} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {makeStyleSheetFromTheme, changeOpacity} from 'app/utils/theme';

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
        const {theme} = this.props;
        const style = getStyleSheet(theme);
        return (
            <TouchableWithFeedback
                style={style.tappableContainer}
                onPress={this.handleOnPress}
                type={'opacity'}
            >
                <View style={style.removeButton}>
                    <Icon
                        name='close-circle'
                        color={changeOpacity(theme.centerChannelColor, 0.64)}
                        size={18}
                    />
                </View>
            </TouchableWithFeedback>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        tappableContainer: {
            position: 'absolute',
            elevation: 11,
            top: -2,
            right: -16,
            width: 32,
            height: 32,
        },
        removeButton: {
            borderRadius: 20,
            alignSelf: 'center',
            paddingTop: 6,
            paddingHorizontal: 1,
            backgroundColor: theme.centerChannelBg,
        },
    };
});
