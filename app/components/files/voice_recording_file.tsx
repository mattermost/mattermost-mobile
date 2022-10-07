// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';
import {Text} from 'react-native';

type Props = {
    file: FileInfo;
}

function VoiceRecordingFile({
    file,
}: Props) {
    return <Text>{'I am a recording'}</Text>;
}

export default VoiceRecordingFile;
