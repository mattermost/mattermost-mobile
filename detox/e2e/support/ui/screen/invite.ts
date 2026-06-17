// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ChannelListScreen} from '@support/ui/screen';
import {timeouts, wait} from '@support/utils';
import {waitFor} from 'detox';

class InviteScreen {
    testID = {
        inviteScreen: 'invite.screen',
        screenSummary: 'invite.screen.summary',
        screenSelection: 'invite.screen.selection',

        // The invite screen's close (X) button is rendered via the route's
        // navigation header at app/routes/(modals)/invite.tsx:19 using the
        // testID `close.invite.button` (note the prefix order).
        closeButton: 'close.invite.button',
        sendButton: 'invite.send.button',

        // After sending invites the screen replaces with the Summary view,
        // which has a "Done" button (testID `invite.summary_button.DONE`) in
        // place of the header close X.
        summaryDoneButton: 'invite.summary_button.DONE',
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
    summaryDoneButton = element(by.id(this.testID.summaryDoneButton));
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
        // The invite modal has two leaf states with different "close affordance":
        //   1. Selection screen (default after open) — header X (closeButton).
        //   2. Summary screen (after Send completes) — "Done" button in body.
        // Tests that send invites (e.g. MM-T5365) land on Summary at end of
        // body, then `afterAll` calls close(). The header X is unmounted on
        // Summary, so try X first and fall through to Done when absent.
        try {
            await waitFor(this.closeButton).toBeVisible().withTimeout(timeouts.TWO_SEC);
            await this.closeButton.tap();
        } catch {
            await this.summaryDoneButton.tap();
        }
        await waitFor(this.inviteScreen).not.toBeVisible().withTimeout(timeouts.TEN_SEC);
    };
}

const inviteScreen = new InviteScreen();
export default inviteScreen;
