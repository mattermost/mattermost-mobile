// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export interface ClientFilesMix {
    getFileUrl: (fileId: string, timestamp: number) => string;
    getFileThumbnailUrl: (fileId: string, timestamp: number) => string;
    getFilePreviewUrl: (fileId: string, timestamp: number) => string;
    getFilePublicLink: (fileId: string) => Promise<any>;
}

const ClientFiles = (superclass: any) => class extends superclass {
    getFileUrl(fileId: string, timestamp: number) {
        let url = `${this.getFileRoute(fileId)}`;
        if (timestamp) {
            url += `?${timestamp}`;
        }

        return url;
    }

    getFileThumbnailUrl(fileId: string, timestamp: number) {
        let url = `${this.getFileRoute(fileId)}/thumbnail`;
        if (timestamp) {
            url += `?${timestamp}`;
        }

        return url;
    }

    getFilePreviewUrl(fileId: string, timestamp: number) {
        let url = `${this.getFileRoute(fileId)}/preview`;
        if (timestamp) {
            url += `?${timestamp}`;
        }

        return url;
    }

    getFilePublicLink = async (fileId: string) => {
        return this.doFetch(
            `${this.getFileRoute(fileId)}/link`,
            {method: 'get'},
        );
    }
};

export default ClientFiles;
