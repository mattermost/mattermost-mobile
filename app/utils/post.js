// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export function buildPostAttachmentText(attachments) {
    let attachmentText = '';

    attachments.forEach((a) => {
        if (a.fields && a.fields.length) {
            a.fields.forEach((f) => {
                attachmentText += ' ' + (f.value || '');
            });
        }

        if (a.pretext) {
            attachmentText += ' ' + a.pretext;
        }

        if (a.text) {
            attachmentText += ' ' + a.text;
        }
    });

    return attachmentText;
}
