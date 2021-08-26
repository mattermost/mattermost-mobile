//
//  Network.swift
//  Gekidou
//
//  Created by Miguel Alatzar on 8/20/21.
//

import Foundation

public typealias ResponseHandler = (_ data: Data?, _ response: URLResponse?, _ error: Error?) -> Void

public struct AckNotification: Codable {
    let id: String
    let type: String
    let serverUrl: String
    let postId: String?
    public let isIdLoaded: Bool
    let receivedAt:Int
    let platform = "ios"
    
    public enum AckNotificationKeys: String, CodingKey {
        case id
        case type
        case serverUrl = "server_url"
        case postId = "post_id"
        case isIdLoaded = "is_id_loaded"
             
    }
    
    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: AckNotificationKeys.self)
        id = try container.decode(String.self, forKey: .id)
        type = try container.decode(String.self, forKey: .type)
        postId = try? container.decode(String.self, forKey: .postId)
        isIdLoaded = (try? container.decode(Bool.self, forKey: .isIdLoaded)) == true
        receivedAt = Date().millisecondsSince1970
        
        if let decodedServerUrl = try? container.decode(String.self, forKey: .serverUrl) {
            serverUrl = decodedServerUrl
        } else {
            serverUrl = try Database.default.getOnlyServerUrl()
        }
    }
}

public struct PostData: Codable {
    let order: [String]
    let posts: [Post]
    let next_post_id: String
    let prev_post_id: String
    
    public enum PostDataKeys: String, CodingKey {
        case order, posts, next_post_id, prev_post_id
    }
    
    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: PostDataKeys.self)
        order = try container.decode([String].self, forKey: .order)
        next_post_id = try container.decode(String.self, forKey: .next_post_id)
        prev_post_id = try container.decode(String.self, forKey: .prev_post_id)
        
        let decodedPosts = try container.decode([String:Post].self, forKey: .posts)
        posts = Array(decodedPosts.values)
    }
}

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
        
        self.session = URLSession.init(configuration: config, delegate: self, delegateQueue: nil)
    }
    
    @objc public static let `default` = Network()
    
    // THIS SHOULD BE QUEUED
    @objc public func fetchPostsForChannel(withId channelId: String, withServerUrl serverUrl: String) {
        let since = try! Database.default.queryPostsSinceForChannel(withId: channelId, withServerUrl: serverUrl)
        
        // Fetch team if we don't have it
        // Fetch channel if we don't have it
        
        let queryParams = since == nil ?
            "?page=0&per_page=\(POST_CHUNK_SIZE)" :
            "?since=\(since)"
        let url = URL(string: "\(serverUrl)/api/v4/channels/\(channelId)/posts\(queryParams)")!
        
        request(url, withMethod: "GET", withServerUrl: serverUrl) { data, response, error in
            if (response as? HTTPURLResponse)?.statusCode == 200, let data = data {
                do {
                    let postData = try JSONDecoder().decode(PostData.self, from: data)
                    if postData.posts.count > 0 {
                        try Database.default.handlePostData(postData, channelId, serverUrl, since != nil)
                    }
                } catch let error {
                    print("Failed to fetch post data", error)
                }
            }
        }
    }
    
    @objc public func postNotificationReceipt(_ userInfo: [AnyHashable:Any]) {
        if let jsonData = try? JSONSerialization.data(withJSONObject: userInfo),
           let ackNotification = try? JSONDecoder().decode(AckNotification.self, from: jsonData) {
            postNotificationReceipt(ackNotification, completionHandler: {_, _, _ in})
        }
    }
    
    public func postNotificationReceipt(_ ackNotification: AckNotification, completionHandler: @escaping ResponseHandler) {
        do {
            let jsonData = try JSONEncoder().encode(ackNotification)
            let headers = ["Content-Type": "application/json; charset=utf-8"]
            let url = URL(string: "\(ackNotification.serverUrl)/api/v4/notifications/ack")!
            request(url, withMethod: "POST", withBody: jsonData, withHeaders: headers, withServerUrl: ackNotification.serverUrl, completionHandler: completionHandler)
        } catch {
            
        }
        
    }
    
    private func request(_ url: URL, withMethod method: String, withServerUrl serverUrl: String, completionHandler: @escaping ResponseHandler) {
        return request(url, withMethod: method, withBody: nil, withHeaders: nil, withServerUrl: serverUrl, completionHandler: completionHandler)
    }
    
    private func request(_ url: URL, withMethod method: String, withBody body: Data?, withHeaders headers: [String:String]?, withServerUrl serverUrl: String, completionHandler: @escaping ResponseHandler) {
        let request = NSMutableURLRequest(url: url)
        request.httpMethod = method
        
        if let body = body {
            request.httpBody = body
        }
        
        if let headers = headers {
            for (key, value) in headers {
                request.setValue(value, forHTTPHeaderField: key)
            }
        }
        
        if let token = try! Keychain.default.getToken(for: serverUrl) {
            request.addValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        let task = session!.dataTask(with: request as URLRequest) { data, response, error in
            completionHandler(data, response, error)
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
            if let (identity, certificate) = try? Keychain.default.getClientIdentityAndCertificate(for: host) {
                credential = URLCredential(identity: identity,
                                           certificates: [certificate],
                                           persistence: URLCredential.Persistence.permanent)
            }
            disposition = .useCredential
        }

        completionHandler(disposition, credential)
    }
}
