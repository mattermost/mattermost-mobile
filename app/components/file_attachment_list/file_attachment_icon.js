// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {
    Component,
    PropTypes
} from 'react';

import {
    View,
    Image,
    StyleSheet
} from 'react-native';

import {makeStyleSheetFromTheme} from 'app/utils/theme';
import * as Utils from 'service/utils/file_utils.js';

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return StyleSheet.create({
        fileIcon: {
            width: 60,
            height: 60
        },
        fileIconWrapper: {
            alignItems: 'center',
            justifyContent: 'center',
            width: 100,
            height: 100,
            backgroundColor: theme.centerChannelColor
        }
    });
});

export default class FileAttachmentIcon extends Component {
    static propTypes = {
        file: PropTypes.object.isRequired,
        theme: PropTypes.object.isRequired
    };

    render() {
        const {file, theme} = this.props;
        const style = getStyleSheet(theme);
        return (
            <View style={style.fileIconWrapper}>
                <Image
                    style={style.fileIcon}
                    source={Utils.getFileIconPath(file)}
                />
            </View>
        );
    }
}
