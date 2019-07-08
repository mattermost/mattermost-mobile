// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {realmConnect} from 'realm-react-redux';

import TestItem from './test_item';

import options from 'app/store/realm_context_options';

function mapPropsToQueries(realm, ownProps) {
    // const channels = realm.objects('Channel').filtered('type=$0', General.OPEN_CHANNEL);
    const item = realm.objectForPrimaryKey('Channel', ownProps.itemId);
    return [item];
}

function mapQueriesToProps([item]) {
    // the returned user is always a different object, avoid passing the full object as props to prevent re-renders
    return {
        item,
    };
}

export default realmConnect(mapPropsToQueries, mapQueriesToProps, null, null, options)(TestItem);
