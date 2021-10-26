import { Disposable, CompositeDisposable, TextEditor, CommandEvent } from 'atom'
// @ts-ignore Merge https://github.com/atom/etch/pull/90
import etch from 'etch'
const $ = etch.dom
import fuzzaldrin from 'fuzzaldrin'

export type EtchElement = HTMLElement
type EtchScheduler = any

import { SelectListProperties } from './select-list-properties'
export type { SelectListProperties } from './select-list-properties'

export default class SelectListView {
  /** When creating a new instance of a select list, or when calling `update` on an existing one,
  you can supply an object with the typeof SelectListProperties */
  props: SelectListProperties

  /** An array containing the filtered and ordered items to be shown in the select list. */
  private items: Array<object | string>

  private disposables: CompositeDisposable
  public element: EtchElement
  private didClickItemsList: boolean
  private visibilityObserver: IntersectionObserver
  private listItems: any[] | null
  private selectionIndex: number | undefined
  private refs: any;

  static setScheduler (scheduler: EtchScheduler) {
    etch.setScheduler(scheduler)
  }

  static getScheduler () {
    return etch.getScheduler()
  }

  constructor (props: SelectListProperties) {
    this.props = props
    if (!this.props.hasOwnProperty('initialSelectionIndex')) {
      this.props.initialSelectionIndex = 0
    }
    if (props.initiallyVisibleItemCount) {
      this.initializeVisibilityObserver()
    }
    this.computeItems(false)
    this.disposables = new CompositeDisposable()
    etch.initialize(this)
    this.element.classList.add('select-list')
    this.disposables.add(this.refs.queryEditor.onDidChange(this.didChangeQuery.bind(this)))
    if (!props.skipCommandsRegistration) {
      this.disposables.add(this.registerAtomCommands())
    }
    const editorElement = this.refs.queryEditor.element
    const didLoseFocus = this.didLoseFocus.bind(this)
    editorElement.addEventListener('blur', didLoseFocus)

    // When clicking the scrollbar of the items list, a blur event will be triggered
    // on the query editor element, but we don't want to treat that as a cancellation.
    // This mousedown listener allows us to detect this case and restore focus to the
    // query editor. This is based on https://stackoverflow.com/a/1480178.
    this.didClickItemsList = false
    this.element.addEventListener('mousedown', event => {
      if (event.target === this.refs.items) {
        this.didClickItemsList = true
      }
    })
    this.disposables.add(new Disposable(() => { editorElement.removeEventListener('blur', didLoseFocus) }))
  }

  initializeVisibilityObserver () {
    this.visibilityObserver = new IntersectionObserver(changes => {
      for (const change of changes) {
        if (change.intersectionRatio > 0) {
          const element = change.target as EtchElement
          this.visibilityObserver.unobserve(element)
          const index = Array.from(this.refs.items.children as EtchElement[]).indexOf(element)
          if (index >= 0) {
            this.renderItemAtIndex(index)
          }
        }
      }
    })
  }

  focus () {
    this.refs.queryEditor.element.focus()
  }

  didLoseFocus (event: {relatedTarget: Node}) {
    if (this.didClickItemsList || this.element.contains(event.relatedTarget)) {
      this.didClickItemsList = false
      this.refs.queryEditor.element.focus()
    } else if (document.hasFocus()) {
      this.cancelSelection()
    }
  }

  reset () {
    this.refs.queryEditor.setText('')
  }

  destroy () {
    this.disposables.dispose()
    if (this.visibilityObserver) this.visibilityObserver.disconnect()
    return etch.destroy(this)
  }

  registerAtomCommands () {
    return atom.commands.add(this.element, {
      'core:move-up': (event: CommandEvent) => {
        this.selectPrevious()
        event.stopPropagation()
      },
      'core:move-down': (event: CommandEvent) => {
        this.selectNext()
        event.stopPropagation()
      },
      'core:move-to-top': (event: CommandEvent) => {
        this.selectFirst()
        event.stopPropagation()
      },
      'core:move-to-bottom': (event: CommandEvent) => {
        this.selectLast()
        event.stopPropagation()
      },
      'core:confirm': (event: CommandEvent) => {
        this.confirmSelection()
        event.stopPropagation()
      },
      'core:cancel': (event: CommandEvent) => {
        this.cancelSelection()
        event.stopPropagation()
      }
    })
  }

  update (props: SelectListProperties) {
    let shouldComputeItems = false

    if ('items' in props) {
      this.props.items = props.items
      shouldComputeItems = true
    }

    if ('maxResults' in props) {
      this.props.maxResults = props.maxResults
      shouldComputeItems = true
    }

    if ('filter' in props) {
      this.props.filter = props.filter
      shouldComputeItems = true
    }

    if ('filterQuery' in props) {
      this.props.filterQuery = props.filterQuery
      shouldComputeItems = true
    }

    if ('query' in props) {
      // Items will be recomputed as part of the change event handler, so we
      // don't need to recompute them again at the end of this function.
      this.refs.queryEditor.setText(props.query)
      shouldComputeItems = false
    }

    if ('selectQuery' in props) {
      if (props.selectQuery) {
        this.refs.queryEditor.selectAll()
      } else {
        this.refs.queryEditor.clearSelections()
      }
    }

    if ('order' in props) {
      this.props.order = props.order
    }

    if ('emptyMessage' in props) {
      this.props.emptyMessage = props.emptyMessage
    }

    if ('errorMessage' in props) {
      this.props.errorMessage = props.errorMessage
    }

    if ('infoMessage' in props) {
      this.props.infoMessage = props.infoMessage
    }

    if ('loadingMessage' in props) {
      this.props.loadingMessage = props.loadingMessage
    }

    if ('loadingBadge' in props) {
      this.props.loadingBadge = props.loadingBadge
    }

    if ('itemsClassList' in props) {
      this.props.itemsClassList = props.itemsClassList
    }

    if ('initialSelectionIndex' in props) {
      this.props.initialSelectionIndex = props.initialSelectionIndex
    }

    if (shouldComputeItems) {
      this.computeItems()
    }

    return etch.update(this)
  }

  render () {
    return $.div(
      {},
      $(TextEditor, {ref: 'queryEditor', mini: true}),
      this.renderLoadingMessage(),
      this.renderInfoMessage(),
      this.renderErrorMessage(),
      this.renderItems()
    )
  }

  renderItems () {
    if (this.items.length > 0) {
      const className = ['list-group'].concat(this.props.itemsClassList || []).join(' ')

      if (this.visibilityObserver) {
        etch.getScheduler().updateDocument(() => {
          Array.from(this.refs.items.children as EtchElement[]).slice(this.props.initiallyVisibleItemCount).forEach((element) => {
            this.visibilityObserver.observe(element)
          })
        })
      }

      this.listItems = this.items.map((item, index) => {
        const selected = this.getSelectedItem() === item
        const visible = !this.props.initiallyVisibleItemCount || index < this.props.initiallyVisibleItemCount
        return $(ListItemView, {
          element: this.props.elementForItem(item, {selected, index, visible}),
          selected: selected,
          onclick: () => this.didClickItem(index)
        })
      })

      return $.ol(
        {className, ref: 'items'},
        ...this.listItems
      )
    } else if (!this.props.loadingMessage && this.props.emptyMessage) {
      return $.span({ref: 'emptyMessage'}, this.props.emptyMessage)
    } else {
      return ""
    }
  }

  renderErrorMessage () {
    if (this.props.errorMessage) {
      return $.span({ref: 'errorMessage'}, this.props.errorMessage)
    } else {
      return ''
    }
  }

  renderInfoMessage () {
    if (this.props.infoMessage) {
      return $.span({ref: 'infoMessage'}, this.props.infoMessage)
    } else {
      return ''
    }
  }

  renderLoadingMessage () {
    if (this.props.loadingMessage) {
      return $.div(
        {className: 'loading'},
        $.span({ref: 'loadingMessage', className: 'loading-message'}, this.props.loadingMessage),
        this.props.loadingBadge ? $.span({ref: 'loadingBadge', className: 'badge'}, this.props.loadingBadge) : ''
      )
    } else {
      return ''
    }
  }

  getQuery () {
    if (this.refs && this.refs.queryEditor) {
      return this.refs.queryEditor.getText()
    } else {
      return ''
    }
  }

  getFilterQuery () {
    return this.props.filterQuery ? this.props.filterQuery(this.getQuery()) : this.getQuery()
  }

  didChangeQuery () {
    if (this.props.didChangeQuery) {
      this.props.didChangeQuery(this.getFilterQuery())
    }

    this.computeItems()
  }

  didClickItem (itemIndex: number) {
    this.selectIndex(itemIndex)
    this.confirmSelection()
  }

  computeItems (updateComponent?: boolean) {
    this.listItems = null
    if (this.visibilityObserver) this.visibilityObserver.disconnect()
    const filterFn = this.props.filter || this.fuzzyFilter.bind(this)
    // @ts-ignore fuzzaldrin types should be fixed
    this.items = filterFn(this.props.items.slice(), this.getFilterQuery())
    if (this.props.order) {
      this.items.sort(this.props.order)
    }
    if (this.props.maxResults) {
      this.items = this.items.slice(0, this.props.maxResults)
    }

    this.selectIndex(this.props.initialSelectionIndex, updateComponent)
  }

  fuzzyFilter (items: Array<string>, query?: string) {
    if (query.length === 0) {
      return items
    } else {
      const scoredItems = []
      for (const item of items) {
        const string = this.props.filterKeyForItem ? this.props.filterKeyForItem(item) : item
        const score = fuzzaldrin.score(string, query)
        if (score > 0) {
          scoredItems.push({item, score})
        }
      }
      scoredItems.sort((a, b) => b.score - a.score)
      return scoredItems.map((i) => i.item)
    }
  }

  getSelectedItem () {
    if (this.selectionIndex === undefined) return null
    return this.items[this.selectionIndex]
  }

  renderItemAtIndex (index: number) {
    const item = this.items[index]
    const selected = this.getSelectedItem() === item
    const component = this.listItems[index].component
    if (this.visibilityObserver) this.visibilityObserver.unobserve(component.element)
    component.update({
      element: this.props.elementForItem(item, {selected, index, visible: true}),
      selected: selected,
      onclick: () => this.didClickItem(index)
    })
  }

  selectPrevious () {
    if (this.selectionIndex === undefined) return this.selectLast()
    return this.selectIndex(this.selectionIndex - 1)
  }

  selectNext () {
    if (this.selectionIndex === undefined) return this.selectFirst()
    return this.selectIndex(this.selectionIndex + 1)
  }

  selectFirst () {
    return this.selectIndex(0)
  }

  selectLast () {
    return this.selectIndex(this.items.length - 1)
  }

  selectNone () {
    return this.selectIndex(undefined)
  }

  selectIndex (index: number, updateComponent = true) {
    if (index >= this.items.length) {
      index = 0
    } else if (index < 0) {
      index = this.items.length - 1
    }

    const oldIndex = this.selectionIndex

    this.selectionIndex = index
    if (index !== undefined && this.props.didChangeSelection) {
      this.props.didChangeSelection(this.getSelectedItem())
    }

    if (updateComponent) {
      if (this.listItems) {
        if (oldIndex >= 0) this.renderItemAtIndex(oldIndex)
        if (index >= 0) this.renderItemAtIndex(index)
        return etch.getScheduler().getNextUpdatePromise()
      } else {
        return etch.update(this)
      }
    } else {
      return Promise.resolve()
    }
  }

  selectItem (item: object | string) {
    const index = this.items.indexOf(item)
    if (index === -1) {
      throw new Error('Cannot select the specified item because it does not exist.')
    } else {
      return this.selectIndex(index)
    }
  }

  confirmSelection () {
    const selectedItem = this.getSelectedItem()
    if (selectedItem != null) {
      if (this.props.didConfirmSelection) {
        this.props.didConfirmSelection(selectedItem)
      }
    } else {
      if (this.props.didConfirmEmptySelection) {
        this.props.didConfirmEmptySelection()
      }
    }
  }

  cancelSelection () {
    if (this.props.didCancelSelection) {
      this.props.didCancelSelection()
    }
  }
}
// cjs export for backward compatibility
module.exports = SelectListView

type ListItemViewProps = { element: EtchElement ; selected: boolean; onclick: () => void }

class ListItemView {
  public element: EtchElement
  public selected: boolean
  public onclick: () => void
  public domEventsDisposable: Disposable

  constructor (props:  ListItemViewProps) {
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

  mouseDown (event: MouseEvent) {
    event.preventDefault()
  }

  mouseUp (event: MouseEvent) {
    event.preventDefault()
  }

  didClick (event: MouseEvent) {
    event.preventDefault()
    this.onclick()
  }

  destroy () {
    this.element.remove()
    this.domEventsDisposable.dispose()
  }

  update (props: ListItemViewProps) {
    this.element.removeEventListener('mousedown', this.mouseDown)
    this.element.removeEventListener('mouseup', this.mouseUp)
    this.element.removeEventListener('click', this.didClick)

    this.element.parentNode.replaceChild(props.element, this.element)
    this.element = props.element
    this.element.addEventListener('mousedown', this.mouseDown)
    this.element.addEventListener('mouseup', this.mouseUp)
    this.element.addEventListener('click', this.didClick)
    if (props.selected) {
      this.element.classList.add('selected')
    }

    this.selected = props.selected
    this.onclick = props.onclick
    etch.getScheduler().updateDocument(this.scrollIntoViewIfNeeded.bind(this))
  }

  scrollIntoViewIfNeeded () {
    if (this.selected) {
      // @ts-ignore: this function is a non-standard API.
      this.element.scrollIntoViewIfNeeded(false)
    }
  }
}
