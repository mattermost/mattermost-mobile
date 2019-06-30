// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {bindActionCreators} from 'redux';
import {realmConnect} from 'realm-react-redux';

import {getMe} from 'app/actions/realm/user';

import Test from './test';

import ReactRealmContext from 'app/store/realm_context';

const options = {
    context: ReactRealmContext,
};

function mapPropsToQueries(realm) {
    const objs = realm.objects('User');
    return [objs];
}

function mapQueriesToProps([users = []]) {
    const user = users[0];
    return {

        // Normally you would use a selector here to create simplified versions
        // of the model containing only what's needed by the UI for rendering.
        user,
    };
}

function mapRealmDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            getMe,
        }, dispatch),
    };
}

export default realmConnect(mapPropsToQueries, mapQueriesToProps, mapRealmDispatchToProps, null, options)(Test);
