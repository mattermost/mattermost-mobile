// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import Autocomplete from 'app/components/autocomplete';
import FileUploadPreview from 'app/components/file_upload_preview';

import Typing from './components/typing';
import PostTextBoxBase from './post_textbox_base';

const AUTOCOMPLETE_MARGIN = 20;
const AUTOCOMPLETE_MAX_HEIGHT = 200;

export default class PostTextBoxAndroid extends PostTextBoxBase {
    render() {
        const {
            deactivatedChannel,
            files,
            rootId,
        } = this.props;

        if (deactivatedChannel) {
            return this.renderDeactivatedChannel();
        }

        const {cursorPosition, top} = this.state;

        return (
            <React.Fragment>
                <Typing/>
                <FileUploadPreview
                    files={files}
                    rootId={rootId}
                />
                <Autocomplete
                    cursorPosition={cursorPosition}
                    maxHeight={Math.min(top - AUTOCOMPLETE_MARGIN, AUTOCOMPLETE_MAX_HEIGHT)}
                    onChangeText={this.handleTextChange}
                    value={this.state.value}
                    rootId={rootId}
                />
                {this.renderTextBox()}
            </React.Fragment>
        );
    }
}
