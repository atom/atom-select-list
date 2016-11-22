/** @babel */
/** @jsx etch.dom */

const {Disposable, CompositeDisposable, TextEditor} = require('atom')
const etch = require('etch')
const fuzzaldrin = require('fuzzaldrin')
const path = require('path')

module.exports = class SelectListView {
  constructor (props) {
    this.props = props
    this.computeItems()
    this.selectIndex(0)
    this.disposables = new CompositeDisposable()
    etch.initialize(this)
    this.element.classList.add('select-list')
    this.disposables.add(this.refs.queryEditor.onDidChange(this.didChangeQuery.bind(this)))
    this.disposables.add(this.registerAtomCommands())
    const editorElement = this.refs.queryEditor.element
    const didLoseFocus = this.didLoseFocus.bind(this)
    editorElement.addEventListener('blur', didLoseFocus)
    this.disposables.add(new Disposable(() => { editorElement.removeEventListener('blur', didLoseFocus) }))
  }

  focus () {
    this.previouslyFocusedElement = document.activeElement
    this.refs.queryEditor.element.focus()
  }

  restoreFocus () {
    this.previouslyFocusedElement.focus()
    this.previouslyFocusedElement = null
  }

  didLoseFocus (event) {
    if (this.element.contains(event.relatedTarget)) {
      this.refs.queryEditor.element.focus()
    } else {
      this.cancelSelection()
    }
  }

  reset () {
    this.refs.queryEditor.setText('')
  }

  destroy () {
    this.disposables.dispose()
    return etch.destroy(this)
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
        this.cancelSelection()
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
        {this.renderItems()}
      </div>
    )
  }

  renderItems () {
    if (this.items.length > 0) {
      return (
        <ol className='list-group' ref='items'>
        {this.items.map((item, index) =>
          <ListItemView
            element={this.props.elementForItem(item)}
            selected={this.getSelectedItem() === item}
            onclick={() => this.didClickItem(index)} />)}
        </ol>
      )

    } else {
      return (
        <span ref="emptyMessage">{this.props.emptyMessage}</span>
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
    this.selectIndex(0)
    etch.update(this)
  }

  didClickItem (itemIndex) {
    this.selectIndex(itemIndex)
    this.confirmSelection()
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
    this.selectIndex(this.selectionIndex - 1)
    return etch.update(this)
  }

  selectNext () {
    this.selectIndex(this.selectionIndex + 1)
    return etch.update(this)
  }

  selectFirst () {
    this.selectIndex(0)
    return etch.update(this)
  }

  selectLast () {
    this.selectIndex(this.items.length - 1)
    return etch.update(this)
  }

  selectIndex (index) {
    if (index === this.items.length) {
      index = 0
    } else if (index === -1) {
      index = this.items.length - 1
    }

    this.selectionIndex = index
    if (this.props.didChangeSelection) {
      this.props.didChangeSelection(this.getSelectedItem())
    }
  }

  confirmSelection () {
    if (this.props.didConfirmSelection) {
      this.props.didConfirmSelection(this.getSelectedItem())
    }
  }

  cancelSelection () {
    if (this.props.didCancelSelection) {
      this.props.didCancelSelection()
    }
  }
}

class ListItemView {
  constructor (props) {
    this.mouseDown = this.mouseDown.bind(this)
    this.mouseUp = this.mouseUp.bind(this)
    this.didClick = this.didClick.bind(this)
    this.selected = props.selected
    this.onclick = props.onclick
    this.element = props.element
    this.element.addEventListener('mousedown', this.mouseDown)
    this.element.addEventListener('mouseup', this.mouseUp)
    this.element.addEventListener('click', this.didClick)
    if (this.selected) {
      this.element.classList.add('selected')
    }
    this.domEventsDisposable = new Disposable(() => {
      this.element.removeEventListener('mousedown', this.mouseDown)
      this.element.removeEventListener('mouseup', this.mouseUp)
      this.element.removeEventListener('click', this.didClick)
    })
    etch.getScheduler().updateDocument(this.scrollIntoViewIfNeeded.bind(this))
  }

  mouseDown (event) {
    event.preventDefault()
  }

  mouseUp () {
    event.preventDefault()
  }

  didClick (event) {
    event.preventDefault()
    this.onclick()
  }

  destroy () {
    if (this.selected) {
      this.element.classList.remove('selected')
    }
    this.domEventsDisposable.dispose()
  }

  update (props) {
    if (this.element !== props.element) {
      this.element.removeEventListener('mousedown', this.mouseDown)
      props.element.addEventListener('mousedown', this.mouseDown)
      this.element.removeEventListener('mouseup', this.mouseUp)
      props.element.addEventListener('mouseup', this.mouseUp)
      this.element.removeEventListener('click', this.didClick)
      props.element.addEventListener('click', this.didClick)

      props.element.classList.remove('selected')
      if (props.selected) {
        props.element.classList.add('selected')
      }
    } else {
      if (this.selected && !props.selected) {
        this.element.classList.remove('selected')
      } else if (!this.selected && props.selected) {
        this.element.classList.add('selected')
      }
    }

    this.element = props.element
    this.selected = props.selected
    this.onclick = props.onclick
    etch.getScheduler().updateDocument(this.scrollIntoViewIfNeeded.bind(this))
  }

  scrollIntoViewIfNeeded () {
    if (this.selected) {
      this.element.scrollIntoViewIfNeeded()
    }
  }
}
