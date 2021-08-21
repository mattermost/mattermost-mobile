//
//  Network.swift
//  Gekidou
//
//  Created by Miguel Alatzar on 8/20/21.
//

import Foundation

typealias ResponseHandler = (_ response: URLResponse?, _ data: Data?, _ error: Error?) -> Void

public class Network: NSObject {
    internal let POST_CHUNK_SIZE = 60
    internal var session: URLSession?
    
    override init() {
        super.init()
        
        let config = URLSessionConfiguration.default
        config.httpAdditionalHeaders = ["X-Requested-With": "XMLHttpRequest"]
        config.allowsCellularAccess = true
        config.timeoutIntervalForRequest = 30
        config.timeoutIntervalForResource = 30
        config.httpMaximumConnectionsPerHost = 10
        if #available(iOS 11.0, *) {
            config.waitsForConnectivity = false
        }
        
        self.session = URLSession.init(configuration: config, delegate: self, delegateQueue: nil)
    }
    
    @objc public static let `default` = Network()
    
    @objc public func fetchPostsForChannel(withId channelId: String, withServerUrl serverUrl: String) {
        let (since, count) = try! Database.default.queryPostsSinceAndCountForChannel(withId: channelId, withServerUrl: serverUrl)
        
        let queryParams = count < POST_CHUNK_SIZE ?
            "?page=0&per_page=\(POST_CHUNK_SIZE)" :
            "?since=\(since)"
        let url = URL(string: "\(serverUrl)/api/v4/channels/\(channelId)/posts\(queryParams)")!
        
        request(url, withMethod: "GET", withServerUrl: serverUrl) { response, data, error in
            if (response as? HTTPURLResponse)?.statusCode == 200,
               let data = data {
                try? Database.default.insertChannelPostsResponse(serverUrl, channelId, data)
            } else {
                print("LOG: FAILED", response)
            }
        }
    }
    
    private func request(_ url: URL, withMethod method: String, withServerUrl serverUrl: String, completionHandler: @escaping ResponseHandler) {
        let request = NSMutableURLRequest(url: url)
        request.httpMethod = method
        
        if let token = try! Keychain.getToken(for: serverUrl) {
            request.addValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        let task = session!.dataTask(with: request as URLRequest) { data, response, error in
            completionHandler(response, data, error)
        }
        
        task.resume()
    }
}

extension Network: URLSessionDelegate, URLSessionTaskDelegate {
    public func urlSession(_ session: URLSession,
                    task: URLSessionTask,
                    didReceive challenge: URLAuthenticationChallenge,
                    completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void) {
        var credential: URLCredential? = nil
        var disposition: URLSession.AuthChallengeDisposition = .performDefaultHandling

        let authMethod = challenge.protectionSpace.authenticationMethod
        if authMethod == NSURLAuthenticationMethodServerTrust {
//            if let session = SessionManager.default.getSession(for: urlSession) {
//                if session.trustSelfSignedServerCertificate {
                    credential = URLCredential(trust: challenge.protectionSpace.serverTrust!)
                    disposition = .useCredential
//                }
//            }
        } else if authMethod == NSURLAuthenticationMethodClientCertificate {
            let host = task.currentRequest!.url!.host!
            if let (identity, certificate) = try? Keychain.getClientIdentityAndCertificate(for: host) {
                credential = URLCredential(identity: identity,
                                           certificates: [certificate],
                                           persistence: URLCredential.Persistence.permanent)
            }
            disposition = .useCredential
        }

        completionHandler(disposition, credential)
    }
}
