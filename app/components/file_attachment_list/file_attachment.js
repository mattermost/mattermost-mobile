// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Text,
    TouchableOpacity,
    View
} from 'react-native';

import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';
import * as Utils from 'mattermost-redux/utils/file_utils.js';

import FileAttachmentDocument, {SUPPORTED_DOCS_FORMAT} from './file_attachment_document';
import FileAttachmentIcon from './file_attachment_icon';
import FileAttachmentImage from './file_attachment_image';

export default class FileAttachment extends PureComponent {
    static propTypes = {
        addFileToFetchCache: PropTypes.func.isRequired,
        fetchCache: PropTypes.object.isRequired,
        file: PropTypes.object.isRequired,
        onInfoPress: PropTypes.func,
        onPreviewPress: PropTypes.func,
        theme: PropTypes.object.isRequired
    };

    static defaultProps = {
        onInfoPress: () => true,
        onPreviewPress: () => true
    };

    handlePreviewPress = () => {
        this.props.onPreviewPress(this.props.file);
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
                    <Text style={style.fileInfo}>
                        {`${file.extension.toUpperCase()} ${Utils.getFormattedFileSize(file)}`}
                    </Text>
                </View>
            </View>
        );
    }

    render() {
        const {file, onInfoPress, theme} = this.props;
        const style = getStyleSheet(theme);

        let mime = file.mime_type;
        if (mime && mime.includes(';')) {
            mime = mime.split(';')[0];
        }

        let fileAttachmentComponent;
        if (file.has_preview_image || file.loading || file.mime_type === 'image/gif') {
            fileAttachmentComponent = (
                <TouchableOpacity onPress={this.handlePreviewPress}>
                    <FileAttachmentImage
                        addFileToFetchCache={this.props.addFileToFetchCache}
                        fetchCache={this.props.fetchCache}
                        file={file}
                        theme={theme}
                    />
                </TouchableOpacity>
            );
        } else if (SUPPORTED_DOCS_FORMAT.includes(mime)) {
            fileAttachmentComponent = (
                <FileAttachmentDocument
                    file={file}
                    theme={theme}
                />
            );
        } else {
            fileAttachmentComponent = (
                <TouchableOpacity onPress={this.handlePreviewPress}>
                    <FileAttachmentIcon
                        file={file}
                        theme={theme}
                    />
                </TouchableOpacity>
            );
        }

        return (
            <View style={style.fileWrapper}>
                {fileAttachmentComponent}
                <TouchableOpacity
                    onPress={onInfoPress}
                    style={style.fileInfoContainer}
                >
                    {this.renderFileInfo()}
                </TouchableOpacity>
            </View>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
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
        },
        circularProgress: {
            width: '100%',
            height: '100%',
            alignItems: 'center',
            justifyContent: 'center'
        },
        circularProgressContent: {
            position: 'absolute',
            height: '100%',
            width: '100%',
            top: 0,
            left: 0,
            alignItems: 'center',
            justifyContent: 'center'
        }
    };
});
