// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {
    Component,
    PropTypes
} from 'react';

import {
    Text,
    View,
    Image,
    StyleSheet
} from 'react-native';

import Icon from 'react-native-vector-icons/FontAwesome';

import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';
import * as Utils from 'service/utils/file_utils.js';

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return StyleSheet.create({
        downloadIcon: {
            color: changeOpacity(theme.centerChannelColor, 0.7),
            marginRight: 5
        },
        fileDownloadContainer: {
            flexDirection: 'row',
            marginTop: 3
        },
        fileInfo: {
            marginLeft: 2,
            fontSize: 14,
            color: changeOpacity(theme.centerChannelColor, 0.5)
        },
        fileInfoContainer: {
            paddingVertical: 5,
            paddingHorizontal: 8,
            flex: 1
        },
        fileName: {
            marginLeft: 2,
            fontSize: 14,
            color: theme.centerChannelColor,
            flexDirection: 'column',
            flexWrap: 'wrap'
        },
        filePreview: {
            width: 60,
            height: 60
        },
        filePreviewWrapper: {
            alignItems: 'center',
            justifyContent: 'center',
            height: 100,
            width: 100,
            backgroundColor: theme.centerChannelColor
        },
        fileWrapper: {
            flex: 1,
            flexDirection: 'row',
            borderWidth: 1,
            borderColor: changeOpacity(theme.centerChannelColor, 0.2),
            marginTop: 10
        }
    });
});

export default class FileAttachment extends Component {
    static propTypes = {
        file: PropTypes.object.isRequired,
        theme: PropTypes.object.isRequired
    };

    renderFileInfo() {
        const {file, theme} = this.props;
        const style = getStyleSheet(theme);

        return (
            <View style={style.fileInfoContainer}>
                <Text style={style.fileName}>
                    {Utils.getTruncatedFilename(file)}
                </Text>
                <View style={style.fileDownloadContainer}>
                    <Icon
                        name='download'
                        size={16}
                        style={style.downloadIcon}
                    />
                    <Text style={style.fileInfo}>
                        {`${file.extension.toUpperCase()} ${Utils.getFormattedFileSize(file)}`}
                    </Text>
                </View>
            </View>
        );
    }

    render() {
        const {file, theme} = this.props;
        const style = getStyleSheet(theme);

        return (
            <View style={style.fileWrapper}>
                <View style={style.filePreviewWrapper}>
                    <Image
                        style={style.filePreview}
                        source={Utils.getFileIconPath(file)}
                    />
                </View>
                {this.renderFileInfo()}
            </View>
        );
    }
}
