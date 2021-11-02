// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

class EditChannelInfo {
    testID = {
        publicChannelTypeAction: 'edit_channel_info.type.public.action',
        privateChannelTypeAction: 'edit_channel_info.type.private.action',
        nameInput: 'edit_channel_info.name.input',
        purposeInput: 'edit_channel_info.purpose.input',
        headerInput: 'edit_channel_info.header.input',
    }

    publicChannelTypeAction = element(by.id(this.testID.publicChannelTypeAction));
    privateChannelTypeAction = element(by.id(this.testID.privateChannelTypeAction));
    nameInput = element(by.id(this.testID.nameInput));
    purposeInput = element(by.id(this.testID.purposeInput));
    headerInput = element(by.id(this.testID.headerInput));
}

const editChannelInfo = new EditChannelInfo();
export default editChannelInfo;
