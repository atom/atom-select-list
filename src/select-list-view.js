/** @babel */
/** @jsx etch.dom */

const {CompositeDisposable, TextEditor} = require('atom')
const etch = require('etch')
const fuzzaldrin = require('fuzzaldrin')
const path = require('path')

module.exports = class SelectListView {
  constructor (props) {
    this.selectionIndex = 0
    this.props = props
    this.computeItems()
    this.disposables = new CompositeDisposable()
    etch.initialize(this)
    this.disposables.add(this.refs.queryEditor.onDidChange(this.didChangeQuery.bind(this)))
    this.disposables.add(this.registerAtomCommands())
    if (this.props.didChangeSelection) {
      this.props.didChangeSelection(this.getSelectedItem())
    }
  }

  destroy () {
    this.disposables.dispose()
    etch.destroy(this)
  }

  registerAtomCommands () {
    return global.atom.commands.add(this.element, {
      'core:move-up': (event) => {
        this.selectPrevious()
        event.stopPropagation()
      },
      'core:move-down': (event) => {
        this.selectNext()
        event.stopPropagation()
      },
      'core:move-to-top': (event) => {
        this.selectFirst()
        event.stopPropagation()
      },
      'core:move-to-bottom': (event) => {
        this.selectLast()
        event.stopPropagation()
      },
      'core:confirm': (event) => {
        this.confirmSelection()
        event.stopPropagation()
      },
      'core:cancel': (event) => {
        etch.destroy(this)
        event.stopPropagation()
      }
    })
  }

  update (props = {}) {
    let shouldComputeItems = false

    if (props.hasOwnProperty('items')) {
      this.props.items = props.items
      shouldComputeItems = true
    }

    if (props.hasOwnProperty('maxResults')) {
      this.props.maxResults = props.maxResults
      shouldComputeItems = true
    }

    if (props.hasOwnProperty('filter')) {
      this.props.filter = props.filter
      shouldComputeItems = true
    }

    if (props.hasOwnProperty('emptyMessage')) {
      this.props.emptyMessage = props.emptyMessage
    }

    if (props.hasOwnProperty('errorMessage')) {
      this.props.errorMessage = props.errorMessage
    }

    if (props.hasOwnProperty('infoMessage')) {
      this.props.infoMessage = props.infoMessage
    }

    if (shouldComputeItems) {
      this.computeItems()
    }

    return etch.update(this)
  }

  render () {
    return (
      <div>
        <TextEditor ref='queryEditor' mini={true} />
        {this.renderInfoMessage()}
        {this.renderErrorMessage()}
        <ul ref='items'>{this.renderItems()}</ul>
      </div>
    )
  }

  renderItems () {
    if (this.items.length > 0) {
      return this.items.map((item) =>
        <ListItemView
          item={this.props.viewForItem(item)}
          selected={this.getSelectedItem() === item} />
      )
    } else {
      return (
        <div>
          <span ref="emptyMessage">{this.props.emptyMessage}</span>
        </div>
      )
    }
  }

  renderErrorMessage () {
    if (this.props.errorMessage) {
      return <span ref="errorMessage">{this.props.errorMessage}</span>
    } else {
      return ''
    }
  }

  renderInfoMessage () {
    if (this.props.infoMessage) {
      return <span ref="infoMessage">{this.props.infoMessage}</span>
    } else {
      return ''
    }
  }

  getQuery () {
    if (this.refs && this.refs.queryEditor) {
      return this.refs.queryEditor.getText()
    } else {
      return ""
    }
  }

  didChangeQuery () {
    if (this.props.didChangeQuery) {
      this.props.didChangeQuery(this.getQuery())
    }

    this.computeItems()
    this.selectionIndex = 0
    etch.update(this)
  }

  computeItems () {
    const filterFn = this.props.filter || this.fuzzyFilter.bind(this)
    this.items = filterFn(this.props.items, this.getQuery()).slice(0, this.props.maxResults || Infinity)
  }

  fuzzyFilter (items, query) {
    if (query.length === 0) {
      return items
    } else {
      const scoredItems = []
      for (const item of items) {
        const string = this.props.filterKeyForItem ? this.props.filterKeyForItem(item) : item
        let score = fuzzaldrin.score(string, query)
        if (score > 0) {
          scoredItems.push({item, score})
        }
      }
      scoredItems.sort((a, b) => b.score - a.score)
      return scoredItems.map((i) => i.item)
    }
  }

  getSelectedItem () {
    return this.items[this.selectionIndex]
  }

  selectPrevious () {
    this.selectionIndex = this.selectionIndex === 0 ? this.items.length - 1 : this.selectionIndex - 1
    if (this.props.didChangeSelection) {
      this.props.didChangeSelection(this.getSelectedItem())
    }
    return this.update()
  }

  selectNext () {
    this.selectionIndex = this.selectionIndex === this.items.length - 1 ? 0 : this.selectionIndex + 1
    if (this.props.didChangeSelection) {
      this.props.didChangeSelection(this.getSelectedItem())
    }
    return this.update()
  }

  selectFirst () {
    this.selectionIndex = 0
    if (this.props.didChangeSelection) {
      this.props.didChangeSelection(this.getSelectedItem())
    }
    return this.update()
  }

  selectLast () {
    this.selectionIndex = this.items.length - 1
    if (this.props.didChangeSelection) {
      this.props.didChangeSelection(this.getSelectedItem())
    }
    return etch.update(this)
  }

  confirmSelection () {
    if (this.props.didConfirmSelection) {
      this.props.didConfirmSelection(this.getSelectedItem())
    }
    return etch.destroy(this)
  }
}

class ListItemView {
  constructor (props) {
    this.props = props
    etch.initialize(this)
  }

  update (props) {
    this.props = props
    return etch.update(this)
  }

  render () {
    const className = this.props.selected ? 'selected' : ''
    return <li className={className}>{this.props.item}</li>
  }

  writeAfterUpdate () {
    if (this.props.selected) {
      this.element.scrollIntoViewIfNeeded()
    }
  }
}
