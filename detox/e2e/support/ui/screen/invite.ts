// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ChannelListScreen} from '@support/ui/screen';
import {timeouts, wait} from '@support/utils';
import {expect} from 'detox';

class InviteScreen {
    testID = {
        inviteScreen: 'invite.screen',
        screenSummary: 'invite.screen.summary',
        screenSelection: 'invite.screen.selection',
        closeButton: 'invite.close.button',
        sendButton: 'invite.send.button',
        teamIcon: 'invite.team_icon',
        teamDisplayName: 'invite.team_display_name',
        serverDisplayName: 'invite.server_display_name',
        shareLinkButton: 'invite.share_link.button',
        searchBarTitle: 'invite.search_bar_title',
        searchBarInput: 'invite.search_bar_input',
        selectedItems: 'invite.selected_items',
        selectedItemPrefix: 'invite.selected_item',
        searchList: 'invite.search_list',
        searchListItemPrefix: 'invite.search_list_item.',
        searchListTextItemPrefix: 'invite.search_list_text_item',
        searchListUserItemPrefix: 'invite.search_list_user_item',
        searchListNoResultsPrefix: 'invite.search_list_no_results',
        summaryReportPrefix: 'invite.summary_report',
        summaryReportTextItemPrefix: 'invite.summary_report.text_item',
        summaryReportUserItemPrefix: 'invite.summary_report.user_item',
    };

    inviteScreen = element(by.id(this.testID.inviteScreen));
    screenSummary = element(by.id(this.testID.screenSummary));
    screenSelection = element(by.id(this.testID.screenSelection));
    closeButton = element(by.id(this.testID.closeButton));
    sendButton = element(by.id(this.testID.sendButton));
    teamIcon = element(by.id(this.testID.teamIcon));
    teamDisplayName = element(by.id(this.testID.teamDisplayName));
    serverDisplayName = element(by.id(this.testID.serverDisplayName));
    shareLinkButton = element(by.id(this.testID.shareLinkButton));
    searchBarTitle = element(by.id(this.testID.searchBarTitle));
    searchBarInput = element(by.id(this.testID.searchBarInput));
    selectedItems = element(by.id(this.testID.selectedItems));
    selectedItemPrefix = element(by.id(this.testID.selectedItemPrefix));
    searchList = element(by.id(this.testID.searchList));
    searchListItemPrefix = element(by.id(this.testID.searchListItemPrefix));
    searchListTextItemPrefix = element(by.id(this.testID.searchListTextItemPrefix));
    searchListUserItemPrefix = element(by.id(this.testID.searchListUserItemPrefix));
    searchListNoResultsPrefix = element(by.id(this.testID.searchListNoResultsPrefix));
    summaryReportTextItemPrefix = element(by.id(this.testID.summaryReportTextItemPrefix));
    summaryReportUserItemPrefix = element(by.id(this.testID.summaryReportUserItemPrefix));

    getSearchListTextItem = (id: string) => {
        return element(by.id(`${this.testID.searchListTextItemPrefix}.${id}`));
    };

    getSearchListTextItemText = (id: string) => {
        return element(by.id(`${this.testID.searchListTextItemPrefix}.text.${id}`));
    };

    getSearchListUserItem = (id: string) => {
        return element(by.id(`${this.testID.searchListUserItemPrefix}.${id}`));
    };

    getSearchListUserItemText = (id: string) => {
        return element(by.id(`${this.testID.searchListUserItemPrefix}.${id}.display_name`));
    };

    getSearchListNoResults = (id: string) => {
        return element(by.id(`${this.testID.searchListNoResultsPrefix}.${id}`));
    };

    getSearchListNoResultsText = (id: string) => {
        return element(by.id(`${this.testID.searchListNoResultsPrefix}.text.${id}`));
    };

    getSelectedItem = (id: string) => {
        return element(by.id(`${this.testID.selectedItemPrefix}.${id}`));
    };

    getSelectedChip = () => {
        return element(by.id('invite.selected_item.display_name'));
    };

    getSummaryReportSent = () => {
        return element(by.id(`${this.testID.summaryReportPrefix}.sent`));
    };

    getSummaryReportNotSent = () => {
        return element(by.id(`${this.testID.summaryReportPrefix}.not_sent`));
    };

    getSummaryReportTextItem = (id: string) => {
        return element(by.id(`${this.testID.summaryReportTextItemPrefix}.${id}`));
    };

    getSummaryReportTextItemText = (id: string) => {
        return element(by.id(`${this.testID.summaryReportTextItemPrefix}.text.${id}`));
    };

    getSummaryReportUserItem = (id: string) => {
        return element(by.id(`${this.testID.summaryReportUserItemPrefix}.${id}`));
    };

    getSummaryReportUserItemText = (id: string) => {
        return element(by.id(`${this.testID.summaryReportUserItemPrefix}.${id}.display_name`));
    };

    toBeVisible = async () => {
        await waitFor(this.inviteScreen).toExist().withTimeout(timeouts.TEN_SEC);

        return this.inviteScreen;
    };

    open = async () => {
        await ChannelListScreen.headerPlusButton.tap();
        await wait(timeouts.ONE_SEC);
        await ChannelListScreen.invitePeopleToTeamItem.tap();

        return this.toBeVisible();
    };

    close = async () => {
        await this.closeButton.tap();
        await expect(this.inviteScreen).not.toBeVisible();
    };
}

const inviteScreen = new InviteScreen();
export default inviteScreen;
