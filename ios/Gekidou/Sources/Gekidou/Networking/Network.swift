//
//  Network.swift
//  Gekidou
//
//  Created by Miguel Alatzar on 8/20/21.
//

import Foundation

public typealias ResponseHandler = (_ data: Data?, _ response: URLResponse?, _ error: Error?) -> Void

public class Network: NSObject {
    internal var session: URLSession?
    internal let queue = OperationQueue()
    
    override init() {
        super.init()
        
        queue.maxConcurrentOperationCount = 1
        
        let config = URLSessionConfiguration.default
        config.httpAdditionalHeaders = ["X-Requested-With": "XMLHttpRequest"]
        config.allowsCellularAccess = true
        config.timeoutIntervalForRequest = 30
        config.timeoutIntervalForResource = 30
        config.httpMaximumConnectionsPerHost = 10
        
        self.session = URLSession.init(configuration: config, delegate: self, delegateQueue: nil)
    }
    
    @objc public static let `default` = Network()
    
    internal func responseOK(_ response: URLResponse?) -> Bool {
        return (response as? HTTPURLResponse)?.statusCode == 200
    }
    
    internal func request(_ url: URL, withMethod method: String, withServerUrl serverUrl: String, completionHandler: @escaping ResponseHandler) {
        return request(url, withMethod: method, withBody: nil, withHeaders: nil, withServerUrl: serverUrl, completionHandler: completionHandler)
    }
    
    internal func request(_ url: URL, withMethod method: String, withBody body: Data?, withHeaders headers: [String:String]?, withServerUrl serverUrl: String, completionHandler: @escaping ResponseHandler) {
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
        
        if let token = try? Keychain.default.getToken(for: serverUrl) {
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
