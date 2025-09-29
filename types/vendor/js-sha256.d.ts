// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
declare module 'js-sha256' {
    export interface Sha256Fn {
        (message: string | ArrayBuffer | Uint8Array): string;
        array(message: string | ArrayBuffer | Uint8Array): number[];
        arrayBuffer(message: string | ArrayBuffer | Uint8Array): ArrayBuffer;
        hex(message: string | ArrayBuffer | Uint8Array): string;
    }

    const sha256: Sha256Fn;
    export default sha256;
    export {sha256};
}

