// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/*! based on simple-peer. MIT License. Feross Aboukhadijeh
 * <https://feross.org/opensource> */

import {Buffer} from 'buffer';

import {
    RTCPeerConnection,
    RTCIceCandidate,
    RTCSessionDescription,
    MediaStream,
    MediaStreamTrack,
    EventOnCandidate,
    EventOnAddStream,
    RTCDataChannel,
    RTCSessionDescriptionType,
    MessageEvent,
    RTCIceCandidateType,
} from 'react-native-webrtc';
import stream from 'readable-stream';

import type {ICEServersConfigs} from '@calls/types/calls';

const queueMicrotask = (callback: any) => {
    Promise.resolve().then(callback).catch((e) => setTimeout(() => {
        throw e;
    }));
};

const errCode = (err: Error, code: string) => {
    Object.defineProperty(err, 'code', {value: code, enumerable: true, configurable: true});
    return err;
};

function generateId(): string {
    // Implementation taken from http://stackoverflow.com/a/2117523
    let id = 'xxxxxxxxxxxxxxxxxxxx';

    id = id.replace(/[xy]/g, (c) => {
        const r = Math.floor(Math.random() * 16);

        let v;
        if (c === 'x') {
            v = r;
        } else {
            v = (r & 0x3) | 0x8;
        }

        return v.toString(16);
    });

    return id;
}

const MAX_BUFFERED_AMOUNT = 64 * 1024;
const ICECOMPLETE_TIMEOUT = 5 * 1000;
const CHANNEL_CLOSING_TIMEOUT = 5 * 1000;

/**
 * WebRTC peer connection. Same API as node core `net.Socket`, plus a few extra methods.
 * Duplex stream.
 * @param {Object} opts
 */
export default class Peer extends stream.Duplex {
    destroyed = false;
    destroying = false;
    connecting = false;
    isConnected = false;
    id = generateId().slice(0, 7);
    channelName = generateId();
    streams: MediaStream[];

    private pcReady = false;
    private channelReady = false;
    private iceComplete = false; // ice candidate trickle done (got null candidate)
    private iceCompleteTimer: ReturnType<typeof setTimeout>|null = null; // send an offer/answer anyway after some timeout
    private channel: RTCDataChannel|null = null;
    private pendingCandidates: RTCIceCandidateType[] = [];

    private isNegotiating = false; // is this peer waiting for negotiation to complete?
    private batchedNegotiation = false; // batch synchronous negotiations
    private queuedNegotiation = false; // is there a queued negotiation request?
    private sendersAwaitingStable = [];
    private senderMap = new Map();
    private closingInterval: ReturnType<typeof setInterval>|null = null;

    private remoteTracks: MediaStreamTrack[] = [];
    private remoteStreams: MediaStream[] = [];

    private chunk = null;
    private cb: ((error?: Error | null) => void) | null = null;
    private interval: ReturnType<typeof setInterval>|null = null;

    private pc: RTCPeerConnection|null = null;
    private onFinishBound?: () => void;

    constructor(localStream: MediaStream | null, iceServers: ICEServersConfigs) {
        super({allowHalfOpen: false});

        this.streams = localStream ? [localStream] : [];

        this.onFinishBound = () => {
            this.onFinish();
        };

        const connConfig = {
            iceServers,
            sdpSemantics: 'unified-plan',
        };

        try {
            this.pc = new RTCPeerConnection(connConfig);
        } catch (err) {
            this.destroy(errCode(err as Error, 'ERR_PC_CONSTRUCTOR'));
            return;
        }

        // We prefer feature detection whenever possible, but sometimes that's not
        // possible for certain implementations.
        this.pc.oniceconnectionstatechange = () => {
            this.onIceStateChange();
        };
        this.pc.onicegatheringstatechange = () => {
            this.onIceStateChange();
        };
        this.pc.onconnectionstatechange = () => {
            this.onConnectionStateChange();
        };
        this.pc.onsignalingstatechange = () => {
            this.onSignalingStateChange();
        };
        this.pc.onicecandidate = (event: EventOnCandidate) => {
            this.onIceCandidate(event);
        };

        // Other spec events, unused by this implementation:
        // - onconnectionstatechange
        // - onicecandidateerror
        // - onfingerprintfailure
        // - onnegotiationneeded

        this.setupData(this.pc.createDataChannel(this.channelName, {}));

        if (this.streams) {
            this.streams.forEach((s) => {
                this.addStream(s);
            });
        }

        this.pc.onaddstream = (event: EventOnAddStream) => {
            this.onStream(event);
        };

        this.needsNegotiation();

        this.once('finish', this.onFinishBound);
    }

    get bufferSize() {
        return (this.channel && this.channel.bufferedAmount) || 0;
    }

    // HACK: it's possible channel.readyState is "closing" before peer.destroy() fires
    // https://bugs.chromium.org/p/chromium/issues/detail?id=882743
    get connected() {
        return this.isConnected && this.channel?.readyState === 'open';
    }

    signal(dataIn: string | any) {
        if (this.destroying) {
            return;
        }
        if (this.destroyed) {
            throw errCode(
                new Error('cannot signal after peer is destroyed'),
                'ERR_DESTROYED',
            );
        }

        let data = dataIn;
        if (typeof data === 'string') {
            try {
                data = JSON.parse(dataIn);
            } catch (err) {
                data = {};
            }
        }

        if (data.renegotiate) {
            this.needsNegotiation();
        }
        if (data.transceiverRequest) {
            this.addTransceiver(
                data.transceiverRequest.kind,
                data.transceiverRequest.init,
            );
        }
        if (data.candidate) {
            if (this.pc?.remoteDescription && this.pc?.remoteDescription.type) {
                this.addIceCandidate(data.candidate);
            } else {
                this.pendingCandidates.push(data.candidate);
            }
        }
        if (data.sdp) {
            this.pc?.
                setRemoteDescription(
                    new RTCSessionDescription(data),
                ).
                then(() => {
                    if (this.destroyed) {
                        return;
                    }

                    this.pendingCandidates.forEach((candidate: RTCIceCandidateType) => {
                        this.addIceCandidate(candidate);
                    });
                    this.pendingCandidates = [];

                    if (this.pc?.remoteDescription.type === 'offer') {
                        this.createAnswer();
                    }
                }).
                catch((err: Error) => {
                    this.destroy(errCode(err, 'ERR_SET_REMOTE_DESCRIPTION'));
                });
        }
        if (
            !data.sdp &&
            !data.candidate &&
            !data.renegotiate &&
            !data.transceiverRequest
        ) {
            this.destroy(
                errCode(
                    new Error('signal() called with invalid signal data'),
                    'ERR_SIGNALING',
                ),
            );
        }
    }

    addIceCandidate(candidate: RTCIceCandidateType) {
        const iceCandidateObj = new RTCIceCandidate(candidate);
        this.pc?.addIceCandidate(iceCandidateObj).catch((err: Error) => {
            this.destroy(errCode(err, 'ERR_ADD_ICE_CANDIDATE'));
        });
    }

    /**
     * Send text/binary data to the remote peer.
     * @param {ArrayBufferView|ArrayBuffer|Buffer|string|Blob} chunk
     */
    send(chunk: string | ArrayBuffer | ArrayBufferView) {
        if (this.destroying) {
            return;
        }
        if (this.destroyed) {
            throw errCode(
                new Error('cannot send after peer is destroyed'),
                'ERR_DESTROYED',
            );
        }
        this.channel?.send(chunk);
    }

    /**
     * Add a Transceiver to the connection.
     * @param {String} kind
     * @param {Object} init
     */
    addTransceiver(kind: 'audio'|'video'|MediaStreamTrack, init: any) {
        if (this.destroying) {
            return;
        }
        if (this.destroyed) {
            throw errCode(
                new Error('cannot addTransceiver after peer is destroyed'),
                'ERR_DESTROYED',
            );
        }

        try {
            this.pc?.addTransceiver(kind, init);
            this.needsNegotiation();
        } catch (err) {
            this.destroy(errCode(err as Error, 'ERR_ADD_TRANSCEIVER'));
        }
    }

    /**
     * Add a MediaStream to the connection.
     * @param {MediaStream} s
     */
    addStream(s: MediaStream) {
        if (this.destroying) {
            return;
        }
        if (this.destroyed) {
            throw errCode(
                new Error('cannot addStream after peer is destroyed'),
                'ERR_DESTROYED',
            );
        }

        s.getTracks().forEach((track: MediaStreamTrack) => {
            this.addTrack(track, s);
        });
    }

    /**
     * Add a MediaStreamTrack to the connection.
     * @param {MediaStreamTrack} track
     * @param {MediaStream} s
     */
    async addTrack(track: MediaStreamTrack, s: MediaStream) {
        if (this.destroying) {
            return;
        }
        if (this.destroyed || !this.pc) {
            throw errCode(
                new Error('cannot addTrack after peer is destroyed'),
                'ERR_DESTROYED',
            );
        }

        const submap = this.senderMap.get(track) || new Map(); // nested Maps map [track, stream] to sender
        const sender = submap.get(s);
        if (!sender) {
            const transceiver = await this.pc.addTransceiver(track, {direction: 'sendrecv'}) as any;
            /* eslint-disable no-underscore-dangle */
            submap.set(s, transceiver._sender);
            this.senderMap.set(track, submap);
            this.needsNegotiation();
        } else if (sender.removed) {
            throw errCode(
                new Error(
                    'Track has been removed. You should enable/disable tracks that you want to re-add.',
                ),
                'ERR_SENDER_REMOVED',
            );
        } else {
            throw errCode(
                new Error('Track has already been added to that stream.'),
                'ERR_SENDER_ALREADY_ADDED',
            );
        }
    }

    /**
   * Replace a MediaStreamTrack by another in the connection.
   * @param {MediaStreamTrack} oldTrack
   * @param {MediaStreamTrack} newTrack
   * @param {MediaStream} stream
   */
    replaceTrack(oldTrack: MediaStreamTrack, newTrack: MediaStreamTrack | null, s: MediaStream) {
        if (this.destroying) {
            return;
        }
        if (this.destroyed) {
            throw errCode(new Error('cannot replaceTrack after peer is destroyed'), 'ERR_DESTROYED');
        }

        const submap = this.senderMap.get(oldTrack);
        const sender = submap ? submap.get(s) : null;
        if (!sender) {
            throw errCode(new Error('Cannot replace track that was never added.'), 'ERR_TRACK_NOT_ADDED');
        }
        if (newTrack) {
            this.senderMap.set(newTrack, submap);
        }

        if (sender.replaceTrack == null) {
            this.destroy(errCode(new Error('replaceTrack is not supported in this browser'), 'ERR_UNSUPPORTED_REPLACETRACK'));
        } else {
            sender.replaceTrack(newTrack);
        }
    }

    needsNegotiation() {
        if (this.batchedNegotiation) {
            return;
        } // batch synchronous renegotiations
        this.batchedNegotiation = true;
        queueMicrotask(() => {
            this.batchedNegotiation = false;
            this.negotiate();
        });
    }

    negotiate() {
        if (this.destroying) {
            return;
        }
        if (this.destroyed) {
            throw errCode(
                new Error('cannot negotiate after peer is destroyed'),
                'ERR_DESTROYED',
            );
        }

        if (this.isNegotiating) {
            this.queuedNegotiation = true;
        } else {
            setTimeout(() => {
                // HACK: Chrome crashes if we immediately call createOffer
                this.createOffer();
            }, 0);
        }
        this.isNegotiating = true;
    }

    destroy(err?: Error, cb?: (error: Error | null) => void, cbPCClose?: () => void): this {
        this._destroy(err, cb, cbPCClose);
        return this;
    }

    _destroy(err?: Error | null, cb?: (error: Error | null) => void, cbPcClose?: () => void) {
        if (this.destroyed || this.destroying) {
            return;
        }
        this.destroying = true;

        setTimeout(() => {
            // allow events concurrent with the call to _destroy() to fire (see #692)
            this.destroyed = true;
            this.destroying = false;

            this.readable = false;
            this.writable = false;

            // if (!this._readableState?.ended) this.push(null);
            // if (!this._writableState?.finished) this.end();

            this.isConnected = false;
            this.pcReady = false;
            this.channelReady = false;
            this.remoteTracks = [];
            this.remoteStreams = [];
            this.senderMap = new Map();

            if (this.closingInterval) {
                clearInterval(this.closingInterval);
            }
            this.closingInterval = null;

            if (this.interval) {
                clearInterval(this.interval);
            }
            this.interval = null;
            this.chunk = null;
            this.cb = null;

            if (this.onFinishBound) {
                this.removeListener('finish', this.onFinishBound);
            }
            this.onFinishBound = undefined;

            if (this.channel) {
                try {
                    this.channel.close();
                } catch (err) {} // eslint-disable-line

                // allow events concurrent with destruction to be handled
                this.channel.onmessage = undefined;
                this.channel.onopen = undefined;
                this.channel.onclose = undefined;
                this.channel.onerror = undefined;
            }
            if (this.pc) {
                try {
                    this.pc.close(cbPcClose);
                } catch (err) {} // eslint-disable-line

                // allow events concurrent with destruction to be handled
                this.pc.oniceconnectionstatechange = () => undefined;
                this.pc.onicegatheringstatechange = () => undefined;
                this.pc.onsignalingstatechange = () => undefined;
                this.pc.onicecandidate = () => undefined;
            }
            this.pc = null;
            this.channel = null;

            if (err) {
                this.emit('error', err);
            }
            this.emit('close');
            cb?.(null);
        }, 0);
    }

    setupData(channel: RTCDataChannel) {
        if (!channel) {
            // In some situations `pc.createDataChannel()` returns `undefined` (in wrtc),
            // which is invalid behavior. Handle it gracefully.
            // See: https://github.com/feross/simple-peer/issues/163
            this.destroy(
                errCode(
                    new Error(
                        'Data channel is missing `channel` property',
                    ),
                    'ERR_DATA_CHANNEL',
                ),
            );
            return;
        }

        this.channel = channel;
        this.channel.binaryType = 'arraybuffer';

        if (typeof this.channel.bufferedAmountLowThreshold === 'number') {
            this.channel.bufferedAmountLowThreshold = MAX_BUFFERED_AMOUNT;
        }

        this.channelName = this.channel.label;

        this.channel.onmessage = (e: MessageEvent) => {
            this.onChannelMessage(e);
        };
        this.channel.onbufferedamountlow = () => {
            this.onChannelBufferedAmountLow();
        };
        this.channel.onopen = () => {
            this.onChannelOpen();
        };
        this.channel.onclose = () => {
            this.onChannelClose();
        };
        this.channel.onerror = (e: any) => {
            const err =
                e.error instanceof Error ? e.error : new Error(
                    `Datachannel error: ${e.message} ${e.filename}:${e.lineno}:${e.colno}`,
                );
            this.destroy(errCode(err, 'ERR_DATA_CHANNEL'));
        };

        // HACK: Chrome will sometimes get stuck in readyState "closing", let's check for this condition
        // https://bugs.chromium.org/p/chromium/issues/detail?id=882743
        let isClosing = false;
        this.closingInterval = setInterval(() => {
            // No "onclosing" event
            if (this.channel && this.channel.readyState === 'closing') {
                if (isClosing) {
                    this.onChannelClose();
                } // closing timed out: equivalent to onclose firing
                isClosing = true;
            } else {
                isClosing = false;
            }
        }, CHANNEL_CLOSING_TIMEOUT);
    }

    _read() {
        return null;
    }

    _write(chunk: any, encoding: string, cb: (error?: Error | null) => void): void {
        if (this.destroyed) {
            cb(
                errCode(
                    new Error('cannot write after peer is destroyed'),
                    'ERR_DATA_CHANNEL',
                ),
            );
            return;
        }

        if (this.isConnected) {
            try {
                this.send(chunk);
            } catch (err) {
                this.destroy(errCode(err as Error, 'ERR_DATA_CHANNEL'));
                return;
            }
            if (this.channel?.bufferedAmount && this.channel?.bufferedAmount > MAX_BUFFERED_AMOUNT) {
                this.cb = cb;
            } else {
                cb(null);
            }
        } else {
            this.chunk = chunk;
            this.cb = cb;
        }
    }

    // When stream finishes writing, close socket. Half open connections are not
    // supported.
    onFinish() {
        if (this.destroyed) {
            return;
        }

        // Wait a bit before destroying so the socket flushes.
        const destroySoon = () => {
            setTimeout(() => this.destroy(), 1000);
        };

        if (this.isConnected) {
            destroySoon();
        } else {
            this.once('connect', destroySoon);
        }
    }

    startIceCompleteTimeout() {
        if (this.destroyed) {
            return;
        }
        if (this.iceCompleteTimer) {
            return;
        }
        this.iceCompleteTimer = setTimeout(() => {
            if (!this.iceComplete) {
                this.iceComplete = true;
                this.emit('iceTimeout');
                this.emit('iceComplete');
            }
        }, ICECOMPLETE_TIMEOUT);
    }

    createOffer() {
        if (this.destroyed) {
            return;
        }

        this.pc?.
            createOffer({}).
            then((offer: RTCSessionDescriptionType) => {
                if (this.destroyed) {
                    return;
                }

                const sendOffer = () => {
                    if (this.destroyed) {
                        return;
                    }
                    const signal = this.pc?.localDescription || offer;
                    this.emit('signal', {
                        type: signal.type,
                        sdp: signal.sdp,
                    });
                };

                const onSuccess = () => {
                    if (this.destroyed) {
                        return;
                    }
                    sendOffer();
                };

                const onError = (err: Error) => {
                    this.destroy(errCode(err, 'ERR_SET_LOCAL_DESCRIPTION'));
                };

                this.pc?.
                    setLocalDescription(offer).
                    then(onSuccess).
                    catch(onError);
            }).
            catch((err: Error) => {
                this.destroy(errCode(err, 'ERR_CREATE_OFFER'));
            });
    }

    createAnswer() {
        if (this.destroyed) {
            return;
        }

        this.pc?.
            createAnswer({}).
            then((answer: RTCSessionDescriptionType) => {
                if (this.destroyed) {
                    return;
                }

                const sendAnswer = () => {
                    if (this.destroyed) {
                        return;
                    }
                    const signal = this.pc?.localDescription || answer;
                    this.emit('signal', {
                        type: signal.type,
                        sdp: signal.sdp,
                    });
                };

                const onSuccess = () => {
                    if (this.destroyed) {
                        return;
                    }
                    sendAnswer();
                };

                const onError = (err: Error) => {
                    this.destroy(errCode(err, 'ERR_SET_LOCAL_DESCRIPTION'));
                };

                this.pc?.
                    setLocalDescription(answer).
                    then(onSuccess).
                    catch(onError);
            }).
            catch((err: Error) => {
                this.destroy(errCode(err, 'ERR_CREATE_ANSWER'));
            });
    }

    onConnectionStateChange() {
        if (this.destroyed) {
            return;
        }
        if (this.pc?.connectionState === 'failed') {
            this.destroy(
                errCode(
                    new Error('Connection failed.'),
                    'ERR_CONNECTION_FAILURE',
                ),
            );
        }
    }

    onIceStateChange() {
        if (this.destroyed) {
            return;
        }
        const iceConnectionState = this.pc?.iceConnectionState;
        const iceGatheringState = this.pc?.iceGatheringState;

        this.emit('iceStateChange', iceConnectionState, iceGatheringState);

        if (
            iceConnectionState === 'connected' ||
            iceConnectionState === 'completed'
        ) {
            this.pcReady = true;
            this.maybeReady();
        }
        if (iceConnectionState === 'failed') {
            this.destroy(
                errCode(
                    new Error('Ice connection failed.'),
                    'ERR_ICE_CONNECTION_FAILURE',
                ),
            );
        }
        if (iceConnectionState === 'closed') {
            this.destroy(
                errCode(
                    new Error('Ice connection closed.'),
                    'ERR_ICE_CONNECTION_CLOSED',
                ),
            );
        }
    }

    getStats(cb: (error: Error|null, reports?: any) => void) {
        // statreports can come with a value array instead of properties
        const flattenValues = (report: any) => {
            if (
                Object.prototype.toString.call(report.values) ===
                '[object Array]'
            ) {
                report.values.forEach((value: any) => {
                    Object.assign(report, value);
                });
            }
            return report;
        };

        this.pc?.getStats().then(
            (res: any) => {
                const reports: any[] = [];
                res.forEach((report: any) => {
                    reports.push(flattenValues(report));
                });
                cb(null, reports);
            },
            (err: Error) => cb(err),
        );
    }

    maybeReady() {
        if (
            this.isConnected ||
            this.connecting ||
            !this.pcReady ||
            !this.channelReady
        ) {
            return;
        }

        this.connecting = true;

        // HACK: We can't rely on order here, for details see https://github.com/js-platform/node-webrtc/issues/339
        const findCandidatePair = () => {
            if (this.destroyed) {
                return;
            }

            this.getStats((err, itemsParam) => {
                if (this.destroyed) {
                    return;
                }

                let items = itemsParam;

                // Treat getStats error as non-fatal. It's not essential.
                if (err) {
                    items = [];
                }

                const remoteCandidates: {[key: string]: any} = {};
                const localCandidates: {[key: string]: any} = {};
                const candidatePairs: {[key: string]: any} = {};
                let foundSelectedCandidatePair = false;

                items.forEach((item: any) => {
                    if (
                        item.type === 'remotecandidate' ||
                        item.type === 'remote-candidate'
                    ) {
                        remoteCandidates[item.id] = item;
                    }
                    if (
                        item.type === 'localcandidate' ||
                        item.type === 'local-candidate'
                    ) {
                        localCandidates[item.id] = item;
                    }
                    if (
                        item.type === 'candidatepair' ||
                        item.type === 'candidate-pair'
                    ) {
                        candidatePairs[item.id] = item;
                    }
                });

                items.forEach((item: any) => {
                    if (
                        (item.type === 'transport' &&
                            item.selectedCandidatePairId) ||
                        (item.type === 'googCandidatePair' &&
                            item.googActiveConnection === 'true') ||
                        ((item.type === 'candidatepair' ||
                            item.type === 'candidate-pair') &&
                            item.selected)
                    ) {
                        foundSelectedCandidatePair = true;
                    }
                });

                // Ignore candidate pair selection in browsers like Safari 11 that do not have any local or remote candidates
                // But wait until at least 1 candidate pair is available
                if (
                    !foundSelectedCandidatePair &&
                    (!Object.keys(candidatePairs).length ||
                        Object.keys(localCandidates).length)
                ) {
                    setTimeout(findCandidatePair, 100);
                    return;
                }
                this.connecting = false;
                this.isConnected = true;

                if (this.chunk) {
                    try {
                        this.send(this.chunk);
                    } catch (err2) {
                        this.destroy(errCode(err2 as Error, 'ERR_DATA_CHANNEL'));
                        return;
                    }
                    this.chunk = null;

                    const cb = this.cb;
                    this.cb = null;
                    if (cb) {
                        cb(null);
                    }
                }

                // If `bufferedAmountLowThreshold` and 'onbufferedamountlow' are unsupported,
                // fallback to using setInterval to implement backpressure.
                if (
                    typeof this.channel?.bufferedAmountLowThreshold !== 'number'
                ) {
                    this.interval = setInterval(() => this.onInterval(), 150);
                    if (this.interval.unref) {
                        this.interval.unref();
                    }
                }

                this.emit('connect');
            });
        };
        findCandidatePair();
    }

    onInterval() {
        if (
            !this.cb ||
            !this.channel ||
            this.channel.bufferedAmount > MAX_BUFFERED_AMOUNT
        ) {
            return;
        }
        this.onChannelBufferedAmountLow();
    }

    onSignalingStateChange() {
        if (this.destroyed) {
            return;
        }

        if (this.pc?.signalingState === 'stable') {
            this.isNegotiating = false;

            // HACK: Firefox doesn't yet support removing tracks when signalingState !== 'stable'
            this.sendersAwaitingStable.forEach((sender) => {
                this.pc?.removeTrack(sender);
                this.queuedNegotiation = true;
            });
            this.sendersAwaitingStable = [];

            if (this.queuedNegotiation) {
                this.queuedNegotiation = false;
                this.needsNegotiation(); // negotiate again
            } else {
                this.emit('negotiated');
            }
        }

        this.emit('signalingStateChange', this.pc?.signalingState);
    }

    onIceCandidate(event: EventOnCandidate) {
        if (this.destroyed) {
            return;
        }
        if (event.candidate) {
            this.emit('signal', {
                type: 'candidate',
                candidate: {
                    candidate: event.candidate.candidate,
                    sdpMLineIndex: event.candidate.sdpMLineIndex,
                    sdpMid: event.candidate.sdpMid,
                },
            });
        } else if (!event.candidate && !this.iceComplete) {
            this.iceComplete = true;
            this.emit('iceComplete');
        }

        // as soon as we've received one valid candidate start timeout
        if (event.candidate) {
            this.startIceCompleteTimeout();
        }
    }

    onChannelMessage(event: MessageEvent) {
        if (this.destroyed) {
            return;
        }
        let data = event.data;
        if (data instanceof ArrayBuffer) {
            data = Buffer.from(data);
        }
        this.push(data);
    }

    onChannelBufferedAmountLow() {
        if (this.destroyed || !this.cb) {
            return;
        }
        const cb = this.cb;
        this.cb = null;
        cb(null);
    }

    onChannelOpen() {
        if (this.isConnected || this.destroyed) {
            return;
        }
        this.channelReady = true;
        this.maybeReady();
    }

    onChannelClose() {
        if (this.destroyed) {
            return;
        }
        this.destroy();
    }

    onStream(event: EventOnAddStream) {
        if (this.destroyed) {
            return;
        }

        event.target._remoteStreams.forEach((eventStream: MediaStream) => { // eslint-disable-line
            eventStream._tracks.forEach((eventTrack: MediaStreamTrack) => { // eslint-disable-line
                if (
                    this.remoteTracks.some((remoteTrack: MediaStreamTrack) => { // eslint-disable-line
                        return remoteTrack.id === eventTrack.id;
                    })
                ) {
                    return;
                } // Only fire one 'stream' event, even though there may be multiple tracks per stream

                if (event.track) {
                    this.remoteTracks.push(event.track);
                    this.emit('track', eventTrack, eventStream);
                }
            });

            if (
                this.remoteStreams.some((remoteStream) => {
                    return remoteStream.id === eventStream.id;
                })
            ) {
                return;
            } // Only fire one 'stream' event, even though there may be multiple tracks per stream

            this.remoteStreams.push(eventStream);
            queueMicrotask(() => {
                this.emit('stream', eventStream); // ensure all tracks have been added
            });
        });
    }
}
