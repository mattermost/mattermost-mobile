// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import {Provider} from 'react-redux';
import {IntlProvider} from 'react-intl';

import {getMyTeams, getMyTeamMembers, selectTeam} from '@mm-redux/actions/teams';

import {selectDefaultTeam} from '@actions/views/select_team';
import {selectDefaultChannel, loadChannelsForTeam} from '@actions/views/channel';
import {getTranslations} from '@i18n';
import {getCurrentLocale} from '@selectors/i18n';
import configureStore from '@store';
import getStorage from '@store/mmkv_adapter';
import Store from '@store/store';
import {waitForHydration} from '@store/utils';

import {extensionSelectTeamId} from './actions';
let Extension;

export default class ShareApp extends PureComponent {
    constructor() {
        super();

        if (!Extension) {
            Extension = require('./extension').default;
        }

        this.state = {init: false};
    }

    componentDidMount() {
        this.mounted = true;
        this.initialize();
    }

    initialize = async () => {
        if (Store.redux) {
            this.hydrate();
            return;
        }

        getStorage().then(this.hydrate);
    };

    hydrate = (MMKVStorage) => {
        if (MMKVStorage) {
            configureStore(MMKVStorage);
        }
        waitForHydration(Store.redux, async () => {
            await this.initTeamAndChannel(Store.redux);

            this.setState({init: true});
        });
    }

    initTeamAndChannel = async ({dispatch, getState}) => {
        await dispatch(getMyTeams());
        await dispatch(getMyTeamMembers());
        
        const {myMembers} = getState().entities.teams;
        if (Object.keys(myMembers).length === 0) {
            dispatch(selectTeam(''));
            dispatch(extensionSelectTeamId(''));
        } else {
            await dispatch(selectDefaultTeam());
            const {currentTeamId} = getState().entities.teams;
            await dispatch(loadChannelsForTeam(currentTeamId));
            await dispatch(selectDefaultChannel(currentTeamId));
            dispatch(extensionSelectTeamId(currentTeamId));
        }
    }

    render() {
        if (!this.state.init) {
            return null;
        }

        const locale = getCurrentLocale(Store.redux.getState());

        return (
            <Provider store={Store.redux}>
                <IntlProvider
                    locale={locale}
                    messages={getTranslations(locale)}
                >
                    <Extension/>
                </IntlProvider>
            </Provider>
        );
    }
}
