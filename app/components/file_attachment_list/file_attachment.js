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
        return (
            <View>
                <Text>{Utils.getTrimmedFilename(file)}</Text>
                <View>
                    <Icon
                        name='file-download'
                        size={18}
                    />
                    <Text>{file.extension.toUpperCase()}</Text>
                    <Text>{Utils.fileSizeToString(file.size)}</Text>
                </View>
            </View>
        );
    }

    render() {
        const file = this.props.file;
        return (
            <View>
                <Image source={Utils.getFileIconPath(file)}/>
                {this.renderFileInfo()}
            </View>
        );
    }
}
