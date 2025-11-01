import Foundation

public typealias CategoriesHandler = (_ categoriesWithOrder: CategoriesWithOrder?) -> Void

extension Network {
    public func fetchCategories(withTeamId teamId: String, forServerUrl serverUrl: String, completionHandler: @escaping CategoriesHandler) {
        var categoriesWithOrder: CategoriesWithOrder?
        guard let channelUrl = buildApiUrl(serverUrl, "/users/me/teams/\(teamId)/channels/categories") else {
            completionHandler(nil)
            return
        }
        request(channelUrl, usingMethod: "GET", forServerUrl: serverUrl) { data, response, error in
            if let data = data {
                categoriesWithOrder = try? JSONDecoder().decode(CategoriesWithOrder.self, from: data)
            }
            completionHandler(categoriesWithOrder)
        }
    }
}
