// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import path from 'node:path';

import axios from 'axios';
import FormData from 'form-data';

import {logInfo} from './log';

import type {ApiResponse, HttpMethod, MattermostClient, ProvisionCredentials} from './types';

function parseJsonBody<T>(data: string): T {
    if (!data) {
        return {} as T;
    }
    try {
        return JSON.parse(data) as T;
    } catch {
        return {message: data} as T;
    }
}

export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

export function createMattermostClient(serverUrl: string): MattermostClient {
    const request = <T = unknown>(
        method: HttpMethod,
        requestPath: string,
        body?: unknown,
        token?: string,
    ): Promise<ApiResponse<T>> => {
        return new Promise((resolve, reject) => {
            const url = new URL(serverUrl + requestPath);
            const lib = url.protocol === 'https:' ? https : http;
            const payload = body ? JSON.stringify(body) : null;
            const options: http.RequestOptions = {
                hostname: url.hostname,
                port: url.port || (url.protocol === 'https:' ? 443 : 80),
                path: url.pathname + url.search,
                method,
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? {Authorization: `Bearer ${token}`} : {}),
                    ...(payload ? {'Content-Length': Buffer.byteLength(payload)} : {}),
                },
            };

            const req = lib.request(options, (res) => {
                let data = '';
                res.on('data', (chunk: string) => {
                    data += chunk;
                });
                res.on('end', () => {
                    resolve({
                        data: parseJsonBody<T>(data),
                        status: res.statusCode || 0,
                        headers: res.headers,
                    });
                });
            });

            req.setTimeout(30_000, () => {
                req.destroy();
                reject(new Error(`Request to ${serverUrl}${requestPath} timed out`));
            });
            req.on('error', reject);
            if (payload) {
                req.write(payload);
            }
            req.end();
        });
    };

    return {serverUrl, request};
}

export async function uploadMultipartFile<T = unknown>(
    client: MattermostClient,
    method: HttpMethod,
    requestPath: string,
    filePath: string,
    fieldName: string,
    token?: string,
): Promise<ApiResponse<T>> {
    const form = new FormData();
    form.append(fieldName, fs.createReadStream(filePath), path.basename(filePath));

    const response = await axios.request({
        url: `${client.serverUrl}${requestPath}`,
        method,
        data: form,
        headers: {
            ...form.getHeaders(),
            ...(token ? {Authorization: `Bearer ${token}`} : {}),
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        validateStatus: () => true,
    });

    const responseData = typeof response.data === 'string' ? parseJsonBody<T>(response.data) : (response.data as T);

    return {
        data: responseData,
        status: response.status,
        headers: response.headers as Record<string, string | string[] | undefined>,
    };
}

type LoginErrorBody = {message?: string};

export async function login(client: MattermostClient, credentials: ProvisionCredentials): Promise<string> {
    logInfo(`Logging in to ${client.serverUrl}...`);
    const res = await client.request<{message?: string}>('POST', '/api/v4/users/login', {
        login_id: credentials.username,
        password: credentials.password,
    });

    if (res.status >= 400) {
        const body = res.data as LoginErrorBody;
        throw new Error(`Login failed (HTTP ${res.status}): ${body.message || JSON.stringify(res.data)}`);
    }

    const token = res.headers.token;
    if (!token || Array.isArray(token)) {
        throw new Error('Login succeeded but no token in response headers');
    }

    logInfo('Admin login successful.');
    return token;
}
