// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {
    Component,
    PropTypes
} from 'react';

import {
    Text,
    View,
    Image
} from 'react-native';

import Icon from 'react-native-vector-icons/MaterialIcons';

import * as Utils from 'service/utils/file_utils.js';

export default class FileAttachment extends Component {
    static propTypes = {
        file: PropTypes.object.isRequired
    };

    renderFileInfo() {
        const {file} = this.props;
        const textStyle = {fontSize: 14, color: '#333'};
        return (
            <View>
                <Text style={textStyle}>
                    {Utils.getTruncatedFilename(file)}
                </Text>
                <View style={{flex: 1, flexDirection: 'row'}}>
                    <Icon
                        name='file-download'
                        size={16}
                        color='#333'
                    />
                    <Text style={textStyle}>
                        {`${file.extension.toUpperCase()} ${Utils.getFormattedFileSize(file)}`}
                    </Text>
                </View>
            </View>
        );
    }

    render() {
        const file = this.props.file;
        return (
            <View style={{flex: 1, flexDirection: 'row'}}>
                <Image source={Utils.getFileIconPath(file)}/>
                {this.renderFileInfo()}
            </View>
        );
    }
}
