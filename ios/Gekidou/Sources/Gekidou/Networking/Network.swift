//
//  Network.swift
//  Gekidou
//
//  Created by Miguel Alatzar on 8/20/21.
//

import Foundation
import os.log

public typealias ResponseHandler = (_ data: Data?, _ response: URLResponse?, _ error: Error?) -> Void

public class Network: NSObject {
    internal var session: URLSession?
    internal let queue = OperationQueue()
    internal let urlVersion = "/api/v4"
    internal var certificates: [String: [SecCertificate]] = [:]

    @objc public static let `default` = Network()
    
    override private init() {
        super.init()
        
        loadPinnedCertificates()
        
        queue.maxConcurrentOperationCount = 1
        
        let config = URLSessionConfiguration.default
        config.httpAdditionalHeaders = ["X-Requested-With": "XMLHttpRequest"]
        config.allowsCellularAccess = true
        config.httpMaximumConnectionsPerHost = 10
        
        self.session = URLSession.init(
            configuration: config,
            delegate: self,
            delegateQueue: nil
        )
    }
    
    internal func loadPinnedCertificates() {
        guard let certsPath = Bundle.app.resourceURL?.appendingPathComponent("certs") else {
            return
        }
        
        let fileManager = FileManager.default
        do {
            let certsArray = try fileManager.contentsOfDirectory(at: certsPath, includingPropertiesForKeys: nil, options: .skipsHiddenFiles)
            let certs = certsArray.filter{ $0.pathExtension == "crt" || $0.pathExtension == "cer"}
                for cert in certs {
                    if let domain = URL(string: cert.absoluteString)?.deletingPathExtension().lastPathComponent,
                       let certData = try? Data(contentsOf: cert),
                       let certificate = SecCertificateCreateWithData(nil, certData as CFData){
                        if certificates[domain] != nil {
                            certificates[domain]?.append(certificate)
                        } else {
                            certificates[domain] = [certificate]
                        }
                        os_log("Gekidou: loaded certificate %{public}@ for domain %{public}@",
                               log: .default,
                               type: .info,
                               cert.lastPathComponent, domain
                        )
                    }
                }
        } catch {
            os_log(
                "Gekidou: Error loading pinned certificates -- %{public}@",
                log: .default,
                type: .error,
                String(describing: error)
            )
        }
    }
    
    internal func buildApiUrl(_ serverUrl: String, _ endpoint: String) -> URL {
        return URL(string: "\(serverUrl)\(urlVersion)\(endpoint)")!
    }
    
    internal func responseOK(_ response: URLResponse?) -> Bool {
        return (response as? HTTPURLResponse)?.statusCode == 200
    }
    
    internal func buildURLRequest(for url: URL, usingMethod method: String, withBody body: Data?, andHeaders headers: [String:String]?, forServerUrl serverUrl: String) -> URLRequest {
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
        
        if let credentials = try? Keychain.default.getCredentials(for: serverUrl) {
            if let token = credentials.token {
                request.addValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            }
            if let preauthSecret = credentials.preauthSecret {
                request.addValue(preauthSecret, forHTTPHeaderField: GekidouConstants.HEADER_X_MATTERMOST_PREAUTH_SECRET)
            }
        }
        
        return request as URLRequest
    }
    
    internal func request(_ url: URL, usingMethod method: String, forServerUrl serverUrl: String, completionHandler: @escaping ResponseHandler) {
        return request(url, withMethod: method, withBody: nil, andHeaders: nil, forServerUrl: serverUrl, completionHandler: completionHandler)
    }
    
    internal func request(_ url: URL, withMethod method: String, withBody body: Data?, andHeaders headers: [String:String]?, forServerUrl serverUrl: String, completionHandler: @escaping ResponseHandler) {
        let urlRequest = buildURLRequest(for: url, usingMethod: method, withBody: body, andHeaders: headers, forServerUrl: serverUrl)
        
        let task = session!.dataTask(with: urlRequest) { data, response, error in
            completionHandler(data, response, error)
        }
        
        task.resume()
    }
}
