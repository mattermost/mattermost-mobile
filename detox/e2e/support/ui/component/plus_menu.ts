// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

class PlusMenu {
    testID = {
        browseChannelsItem: 'plus_menu_item.browse_channels',
        createNewChannelItem: 'plus_menu_item.create_new_channel',
        openDirectMessageItem: 'plus_menu_item.open_direct_message',
        invitePeopleToTeamItem: 'plus_menu_item.invite_people_to_team',
    };

    browseChannelsItem = element(by.id(this.testID.browseChannelsItem));
    createNewChannelItem = element(by.id(this.testID.createNewChannelItem));
    openDirectMessageItem = element(by.id(this.testID.openDirectMessageItem));
    invitePeopleToTeamItem = element(by.id(this.testID.invitePeopleToTeamItem));
}

const plusMenu = new PlusMenu();
export default plusMenu;
