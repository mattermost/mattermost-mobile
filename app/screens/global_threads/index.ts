// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
export {default} from './global_threads';

// import {getTheme} from '@mm-redux/selectors/entities/preferences';
// import {getThreadOrderInCurrentTeam, getUnreadThreadOrderInCurrentTeam} from '@mm-redux/selectors/entities/threads';
// import type {GlobalState} from '@mm-redux/types/store';
// import {connect} from 'react-redux';
// import GlobalThreads from './global_threads';

// function makeMapStateToProps() {
//     return function mapStateToProps(state: GlobalState) {
//         const threadIds = getThreadOrderInCurrentTeam(state);
//         const unreadThreadIds = getUnreadThreadOrderInCurrentTeam(state);
//         console.log(threadIds, unreadThreadIds);
//         return {
//             theme: getTheme(state),
//             threadIds,
//             unreadThreadIds,
//         };
//     };
// }

// export default connect(makeMapStateToProps)(GlobalThreads);
