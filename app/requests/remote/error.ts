// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

//fixme: to be completed in next PR.

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const logError = (_e: any) => null;

// export const logError = async (error: Error, displayable = false) => {
// if (error?.server_error_id === 'api.context.session_expired.app_error') {
//     return {data: true};
// }
//
// const serializedError = serializeError(error);
//
// let sendToServer = true;
// if (error.stack && error.stack.includes('TypeError: Failed to fetch')) {
//     sendToServer = false;
// }
// if (error?.server_error_id) {
//     sendToServer = false;
// }
//
// if (sendToServer) {
//     try {
//         const stringifiedSerializedError = JSON.stringify(serializedError).toString();
//         await Client4.logClientError(stringifiedSerializedError);
//     } catch (err) {
//         // avoid crashing the app if an error sending
//         // the error occurs.
//     }
// }
//
// EventEmitter.emit(ErrorTypes.LOG_ERROR, error);
// dispatch(getLogErrorAction(serializedError, displayable));

//     return {data: true};
// };

