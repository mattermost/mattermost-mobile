// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {
    PropTypes,
    PureComponent
} from 'react';

import {
    Text,
    TouchableOpacity,
    View,
    StyleSheet
} from 'react-native';

import Icon from 'react-native-vector-icons/FontAwesome';

import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';
import * as Utils from 'mattermost-redux/utils/file_utils.js';

import FileAttachmentIcon from './file_attachment_icon';
import FileAttachmentImage from './file_attachment_image';

export default class FileAttachment extends PureComponent {
    static propTypes = {
        addFileToFetchCache: PropTypes.func.isRequired,
        fetchCache: PropTypes.object.isRequired,
        file: PropTypes.object.isRequired,
        onInfoPress: PropTypes.func.isRequired,
        onPreviewPress: PropTypes.func.isRequired,
        theme: PropTypes.object.isRequired
    };

    renderFileInfo() {
        const {file, theme} = this.props;
        const style = getStyleSheet(theme);

        if (!file.id) {
            return null;
        }

        return (
            <View>
                <Text
                    numberOfLines={4}
                    style={style.fileName}
                >
                    {file.name.trim()}
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

    handlePreviewPress = () => {
        this.props.onPreviewPress(this.props.file);
    }

    render() {
        const {file, theme} = this.props;
        const style = getStyleSheet(theme);

        let fileAttachmentComponent;
        if (file.has_preview_image || file.loading) {
            fileAttachmentComponent = (
                <FileAttachmentImage
                    addFileToFetchCache={this.props.addFileToFetchCache}
                    fetchCache={this.props.fetchCache}
                    file={file}
                    theme={theme}
                />
            );
        } else {
            fileAttachmentComponent = (
                <FileAttachmentIcon
                    file={file}
                    theme={theme}
                />
            );
        }

        return (
            <View style={style.fileWrapper}>
                <TouchableOpacity onPress={this.handlePreviewPress}>
                    {fileAttachmentComponent}
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={this.props.onInfoPress}
                    style={style.fileInfoContainer}
                >
                    {this.renderFileInfo()}
                </TouchableOpacity>
            </View>
        );
    }
}

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
            flex: 1,
            paddingHorizontal: 8,
            paddingVertical: 5,
            borderLeftWidth: 1,
            borderLeftColor: changeOpacity(theme.centerChannelColor, 0.2)
        },
        fileName: {
            flexDirection: 'column',
            flexWrap: 'wrap',
            marginLeft: 2,
            fontSize: 14,
            color: theme.centerChannelColor
        },
        fileWrapper: {
            flex: 1,
            flexDirection: 'row',
            marginTop: 10,
            borderWidth: 1,
            borderColor: changeOpacity(theme.centerChannelColor, 0.2)
        }
    });
});
