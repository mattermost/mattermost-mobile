// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';
import {Button, View} from 'react-native';

import {extractFileInfo} from '@utils/file';

type Props = {
    setRecording: (v: boolean) => void;
    addFiles: (f: FileInfo[]) => void;
}

function VoiceInput({
    setRecording,
    addFiles,
}: Props) {
    // const recorder = useRef(new AudioRecorderPlayer());
    // useEffect(() => {
    //     recorder.current?.startRecorder();
    //     return () => {
    //         recorder.current?.stopRecorder();
    //     }
    // }, [])
    return (
        <View>
            <Button
                title='record'
                onPress={async () => {
                    const url = ''; //await recorder.current?.stopRecorder()
                    const fi = await extractFileInfo([{uri: url}]);
                    fi[0].is_voice_recording = true;
                    addFiles(fi as FileInfo[]);
                    setRecording(false);
                }}
            />
        </View>
    );
}

export default VoiceInput;
