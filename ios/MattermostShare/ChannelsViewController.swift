import UIKit

class ChannelsViewController: UIViewController {

  let searchController = UISearchController(searchResultsController: nil)
  
  lazy var tableView: UITableView = {
    let tableView = UITableView(frame: self.view.frame)
    tableView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    tableView.dataSource = self
    tableView.delegate = self
    tableView.backgroundColor = .clear
    tableView.register(UITableViewCell.self, forCellReuseIdentifier: Identifiers.ChannelCell)
    
    return tableView
  }()
  
  var channelDecks = [Section]()
  var filteredDecks: [Section]?
  weak var delegate: ChannelsViewControllerDelegate?
  
  override func viewDidLoad() {
    super.viewDidLoad()
    
    filteredDecks = channelDecks
    title = "Channels"
    configureSearchBar()
    view.addSubview(tableView)
  }
 
  func configureSearchBar() {
    searchController.searchResultsUpdater = self
    searchController.hidesNavigationBarDuringPresentation = false
    searchController.dimsBackgroundDuringPresentation = false
    searchController.searchBar.searchBarStyle = .minimal
    searchController.searchBar.autocapitalizationType = .none
    
    if #available(iOS 11.0, *) {
      // For iOS 11 and later, place the search bar in the navigation bar.
      self.definesPresentationContext = true
      
      // Make the search bar always visible.
      navigationItem.hidesSearchBarWhenScrolling = true
      
      navigationItem.searchController = searchController
    } else {
      // For iOS 10 and earlier, place the search controller's search bar in the table view's header.
      tableView.tableHeaderView = searchController.searchBar
    }
  }
  
}

private extension ChannelsViewController {
  struct Identifiers {
    static let ChannelCell = "channelCell"
  }
}

extension ChannelsViewController: UITableViewDataSource {
  func numberOfSections(in tableView: UITableView) -> Int {
    return filteredDecks?.count ?? 0
  }

  func tableView(_ tableView: UITableView, titleForHeaderInSection section: Int) -> String? {
    let sec = filteredDecks?[section]
    if (sec?.items.count)! > 0 {
      return sec?.title
    }
    
    return nil
  }
  
  func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
    return filteredDecks?[section].items.count ?? 0
  }
  
  func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
    let section = filteredDecks?[indexPath.section]
    let cell = tableView.dequeueReusableCell(withIdentifier: Identifiers.ChannelCell, for: indexPath)
    let item = section?.items[indexPath.row]
    cell.textLabel?.text = item?.title
    if item?.selected ?? false {
      cell.accessoryType = .checkmark
    } else {
      cell.accessoryType = .none
    }
    cell.backgroundColor = .clear
    return cell
  }
}

protocol ChannelsViewControllerDelegate: class {
  func selectedChannel(deck: Item)
}

extension ChannelsViewController: UITableViewDelegate {
  func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
    let section = filteredDecks?[indexPath.section]
    if (section?.items != nil) {
      delegate?.selectedChannel(deck: (section?.items[indexPath.row])!)
    }
  }
}

extension ChannelsViewController: UISearchResultsUpdating {
  func updateSearchResults(for searchController: UISearchController) {
    if let searchText = searchController.searchBar.text, !searchText.isEmpty {
      filteredDecks = channelDecks.map {section in
        let s = section.copy() as! Section
        let items = section.items.filter{($0.title?.lowercased().contains(searchText.lowercased()))!}
        s.items = items
        return s
      }
    } else {
      filteredDecks = channelDecks
    }
    
    tableView.reloadData()
  }
}

extension ChannelsViewController: UISearchBarDelegate {
  func searchBarCancelButtonClicked(_ searchBar: UISearchBar) {
    searchBar.showsCancelButton = false
    searchBar.text = ""
    searchBar.resignFirstResponder()
    tableView.reloadData()
  }
  
  func searchBarTextDidBeginEditing(_ searchBar: UISearchBar) {
    searchBar.showsCancelButton = true
  }
}
