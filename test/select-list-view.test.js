/** @babel */

const assert = require('assert')
const etch = require('etch')
const sinon = require('sinon')
const sandbox = sinon.sandbox.create()
const SelectListView = require('../src/select-list-view')

describe('SelectListView', () => {
  let containerNode = null

  beforeEach(() => {
    containerNode = document.createElement('div')
    document.body.appendChild(containerNode)
  })

  afterEach(() => {
    sandbox.restore()
    containerNode.remove()
  })

  it('items rendering', async () => {
    const items = [{name: 'Grace'}, {name: 'John'}, {name: 'Peter'}]
    const selectListView = new SelectListView({
      items,
      elementForItem: (item) => createElementForItem(item)
    })
    containerNode.appendChild(selectListView.element)
    assert.equal(selectListView.refs.items.innerText, 'Grace\nJohn\nPeter')

    items.reverse()
    await selectListView.update({items})
    assert.equal(selectListView.refs.items.innerText, 'Peter\nJohn\nGrace')

    await selectListView.destroy()
    assert(!selectListView.element.parentElement)
  })

  it('focus', async () => {
    let cancelSelectionEventsCount = 0
    const selectListView = new SelectListView({
      items: [1, 2, 3],
      elementForItem: (item) => document.createElement('input'),
      didCancelSelection: () => { cancelSelectionEventsCount++ }
    })
    const previouslyFocusedElement = document.createElement('input')
    containerNode.appendChild(previouslyFocusedElement)
    previouslyFocusedElement.focus()

    containerNode.appendChild(selectListView.element)
    selectListView.focus()
    assert.equal(document.activeElement.closest('atom-text-editor'), selectListView.refs.queryEditor.element)
    assert.equal(cancelSelectionEventsCount, 0)

    previouslyFocusedElement.focus()
    assert.equal(document.activeElement, previouslyFocusedElement)
    assert.equal(cancelSelectionEventsCount, 1)

    selectListView.focus()
    assert.equal(document.activeElement.closest('atom-text-editor'), selectListView.refs.queryEditor.element)
    assert.equal(cancelSelectionEventsCount, 1)

    selectListView.refs.items.querySelector('input').focus()
    assert.equal(document.activeElement.closest('atom-text-editor'), selectListView.refs.queryEditor.element)
    assert.equal(cancelSelectionEventsCount, 1)

    const documentHasFocusStub = sandbox.stub(document, "hasFocus")
    documentHasFocusStub.callsFake(() => false)
    selectListView.refs.queryEditor.element.dispatchEvent(new FocusEvent('blur'))
    assert.equal(cancelSelectionEventsCount, 1)

    documentHasFocusStub.callsFake(() => true)
    selectListView.refs.queryEditor.element.dispatchEvent(new FocusEvent('blur'))
    assert.equal(cancelSelectionEventsCount, 2)
  })

  it('keyboard navigation and selection', async () => {
    let scrollTop = null
    const selectionConfirmEvents = []
    const selectionChangeEvents = []
    const items = [{name: 'Grace'}, {name: 'John'}, {name: 'Peter'}]
    const selectListView = new SelectListView({
      items,
      elementForItem: (item) => createElementForItem(item),
      didChangeSelection: (item) => { selectionChangeEvents.push(item) },
      didConfirmSelection: (item) => { selectionConfirmEvents.push(item) }
    })

    selectListView.element.style.overflowY = 'auto'
    selectListView.element.style.height = "10px"
    containerNode.appendChild(selectListView.element)

    assert.equal(selectListView.getSelectedItem(), items[0])
    assert.equal(selectListView.element.querySelector('.selected').textContent, items[0].name)
    assert.equal(selectListView.element.scrollTop, 0)
    scrollTop = selectListView.element.scrollTop

    await selectListView.selectNext()
    assert.equal(selectListView.getSelectedItem(), items[1])
    assert.equal(selectListView.element.querySelector('.selected').textContent, items[1].name)
    assert(selectListView.element.scrollTop > scrollTop)
    scrollTop = selectListView.element.scrollTop

    await selectListView.selectNext()
    assert.equal(selectListView.getSelectedItem(), items[2])
    assert.equal(selectListView.element.querySelector('.selected').textContent, items[2].name)
    assert(selectListView.element.scrollTop > scrollTop)
    scrollTop = selectListView.element.scrollTop

    await selectListView.selectNext()
    assert.equal(selectListView.getSelectedItem(), items[0])
    assert.equal(selectListView.element.querySelector('.selected').textContent, items[0].name)
    assert(selectListView.element.scrollTop < scrollTop)
    scrollTop = selectListView.element.scrollTop

    await selectListView.selectPrevious()
    assert.equal(selectListView.getSelectedItem(), items[2])
    assert.equal(selectListView.element.querySelector('.selected').textContent, items[2].name)
    assert(selectListView.element.scrollTop > scrollTop)
    scrollTop = selectListView.element.scrollTop

    await selectListView.selectPrevious()
    assert.equal(selectListView.getSelectedItem(), items[1])
    assert.equal(selectListView.element.querySelector('.selected').textContent, items[1].name)
    assert(selectListView.element.scrollTop < scrollTop)
    scrollTop = selectListView.element.scrollTop

    await selectListView.selectPrevious()
    assert.equal(selectListView.getSelectedItem(), items[0])
    assert.equal(selectListView.element.querySelector('.selected').textContent, items[0].name)
    assert(selectListView.element.scrollTop < scrollTop)
    scrollTop = selectListView.element.scrollTop

    await selectListView.selectLast()
    assert.equal(selectListView.getSelectedItem(), items[2])
    assert.equal(selectListView.element.querySelector('.selected').textContent, items[2].name)
    assert(selectListView.element.scrollTop > scrollTop)
    scrollTop = selectListView.element.scrollTop

    await selectListView.selectFirst()
    assert.equal(selectListView.getSelectedItem(), items[0])
    assert.equal(selectListView.element.querySelector('.selected').textContent, items[0].name)
    assert(selectListView.element.scrollTop < scrollTop)
    scrollTop = selectListView.element.scrollTop

    await selectListView.selectIndex(1)
    assert.equal(selectListView.getSelectedItem(), items[1])
    assert.equal(selectListView.element.querySelector('.selected').textContent, items[1].name)
    assert(selectListView.element.scrollTop > scrollTop)
    scrollTop = selectListView.element.scrollTop

    await selectListView.selectItem(items[2])
    assert.equal(selectListView.getSelectedItem(), items[2])
    assert.equal(selectListView.element.querySelector('.selected').textContent, items[2].name)
    assert(selectListView.element.scrollTop > scrollTop)
    scrollTop = selectListView.element.scrollTop

    assert.throws(() => { selectListView.selectItem(null) })

    assert.deepEqual(selectionConfirmEvents, [])
    assert(selectListView.element.parentElement)
    await selectListView.confirmSelection()
    assert.deepEqual(selectionConfirmEvents, [items[2]])
    assert.deepEqual(selectionChangeEvents, [items[0], items[1], items[2], items[0], items[2], items[1], items[0], items[2], items[0], items[1], items[2]])
  })

  it('keyboard navigation and selection when initial selection undefined', async () => {
    let scrollTop = null
    const selectionConfirmEvents = []
    const selectionChangeEvents = []
    const items = [{name: 'Grace'}, {name: 'John'}, {name: 'Peter'}]
    const selectListView = new SelectListView({
      items,
      initialSelectionIndex: undefined,
      elementForItem: (item) => createElementForItem(item),
      didChangeSelection: (item) => { selectionChangeEvents.push(item) },
      didConfirmSelection: (item) => { selectionConfirmEvents.push(item) }
    })

    selectListView.element.style.overflowY = 'auto'
    selectListView.element.style.height = "10px"
    containerNode.appendChild(selectListView.element)

    assert.equal(selectListView.getSelectedItem(), null)
    assert.equal(selectListView.element.querySelector('.selected'), null)
    assert.equal(selectListView.element.scrollTop, 0)
    scrollTop = selectListView.element.scrollTop

    await selectListView.selectNext()
    assert.equal(selectListView.getSelectedItem(), items[0])
    assert.equal(selectListView.element.querySelector('.selected').textContent, items[0].name)
    assert(selectListView.element.scrollTop > scrollTop)
    scrollTop = selectListView.element.scrollTop

    await selectListView.selectNone()
    assert.equal(selectListView.getSelectedItem(), null)
    assert.equal(selectListView.element.querySelector('.selected'), null)
    assert.equal(selectListView.element.scrollTop, scrollTop)
    scrollTop = selectListView.element.scrollTop

    selectListView.reset()
    await etch.getScheduler().getNextUpdatePromise()
    assert.deepEqual(selectionChangeEvents, [items[0]])

    await selectListView.selectPrevious()
    assert.deepEqual(selectionChangeEvents, [items[0], items[2]])
    assert.equal(selectListView.getSelectedItem(), items[2])
    assert.equal(selectListView.element.querySelector('.selected').textContent, items[2].name)
    await selectListView.confirmSelection()
    assert.deepEqual(selectionConfirmEvents, [items[2]])

    selectListView.reset()
    await etch.getScheduler().getNextUpdatePromise()
    assert.deepEqual(selectionChangeEvents, [items[0], items[2]])
  })

  it('confirming an empty selection', async () => {
    let emptySelectionConfirmEventsCount = 0
    let selectionCancelEventsCount = 0
    const selectionConfirmEvents = []
    const selectionChangeEvents = []
    const items = ['Grace', 'John', 'Peter', '']
    const selectListView = new SelectListView({
      items,
      elementForItem: (item) => createElementForItem(item),
      didChangeSelection: (item) => { selectionChangeEvents.push(item) },
      didConfirmSelection: (item) => { selectionConfirmEvents.push(item) },
      didConfirmEmptySelection: (item) => { emptySelectionConfirmEventsCount++ },
      didCancelSelection: () => { selectionCancelEventsCount++ }
    })
    assert.deepEqual(selectionChangeEvents, [items[0]])

    await selectListView.update({query: 'unexisting'})
    assert(selectListView.getSelectedItem() == null)
    assert.deepEqual(selectionChangeEvents, [items[0], undefined])

    await selectListView.confirmSelection()
    assert.deepEqual(selectionConfirmEvents, [])
    assert.equal(selectionCancelEventsCount, 0)
    assert.equal(emptySelectionConfirmEventsCount, 1)

    selectListView.reset()
    await etch.getScheduler().getNextUpdatePromise()
    assert.deepEqual(selectionChangeEvents, [items[0], undefined, items[0]])

    await selectListView.selectPrevious()
    assert.deepEqual(selectionChangeEvents, [items[0], undefined, items[0], items[3]])
    assert.equal(selectListView.getSelectedItem(), items[3])
    await selectListView.confirmSelection()
    assert.deepEqual(selectionConfirmEvents, [items[3]])

    await selectListView.update({items: []})
    assert(selectListView.getSelectedItem() == null)
    assert.deepEqual(selectionChangeEvents, [items[0], undefined, items[0], items[3], undefined])

    await selectListView.confirmSelection()
    assert.deepEqual(selectionConfirmEvents, [items[3]])
    assert.equal(emptySelectionConfirmEventsCount, 2)
  })

  it('confirming an empty selection when initial selection undefined', async () => {
    let emptySelectionConfirmEventsCount = 0
    let selectionCancelEventsCount = 0
    const selectionConfirmEvents = []
    const selectionChangeEvents = []
    const items = ['Grace', 'John', 'Peter', '']
    const selectListView = new SelectListView({
      items,
      elementForItem: (item) => createElementForItem(item),
      initialSelectionIndex: undefined,
      didChangeSelection: (item) => { selectionChangeEvents.push(item) },
      didConfirmSelection: (item) => { selectionConfirmEvents.push(item) },
      didConfirmEmptySelection: (item) => { emptySelectionConfirmEventsCount++ },
      didCancelSelection: () => { selectionCancelEventsCount++ }
    })
    assert.deepEqual(selectionChangeEvents, [])

    await selectListView.update({query: 'Peter'})
    assert(selectListView.getSelectedItem() == null)
    assert.deepEqual(selectionChangeEvents, [])

    await selectListView.confirmSelection()
    assert.deepEqual(selectionConfirmEvents, [])
    assert.equal(selectionCancelEventsCount, 0)
    assert.equal(emptySelectionConfirmEventsCount, 1)

    selectListView.reset()
    await etch.getScheduler().getNextUpdatePromise()
    assert.deepEqual(selectionChangeEvents, [])

    await selectListView.selectPrevious()
    assert.deepEqual(selectionChangeEvents, [items[3]])
    assert.equal(selectListView.getSelectedItem(), items[3])
    await selectListView.confirmSelection()
    assert.deepEqual(selectionConfirmEvents, [items[3]])

    await selectListView.update({items: []})
    assert(selectListView.getSelectedItem() == null)
    assert.deepEqual(selectionChangeEvents, [items[3]])

    await selectListView.confirmSelection()
    assert.deepEqual(selectionConfirmEvents, [items[3]])
    assert.equal(emptySelectionConfirmEventsCount, 2)
  })

  it('mouse selection', async () => {
    const selectionConfirmEvents = []
    const selectionChangeEvents = []
    const items = [{name: 'Grace'}, {name: 'John'}, {name: 'Peter'}]
    const selectListView = new SelectListView({
      items,
      elementForItem: (item) => createElementForItem(item),
      didChangeSelection: (item) => { selectionChangeEvents.push(item) },
      didConfirmSelection: (item) => { selectionConfirmEvents.push(item) }
    })
    assert.deepEqual(selectionConfirmEvents, [])
    assert.deepEqual(selectionChangeEvents, [items[0]])

    selectListView.element.querySelectorAll('.item')[1].click()
    assert.deepEqual(selectionChangeEvents, [items[0], items[1]])
    assert.deepEqual(selectionConfirmEvents, [items[1]])
  })

  it('default filtering', async () => {
    const items = [{name: 'Grace'}, {name: 'Johnathan'}, {name: 'Joanna'}]
    const selectListView = new SelectListView({
      items,
      filterKeyForItem: (item) => item.name,
      elementForItem: (item) => createElementForItem(item)
    })
    containerNode.appendChild(selectListView.element)
    await selectListView.selectNext()
    assert.equal(selectListView.refs.items.innerText, 'Grace\nJohnathan\nJoanna')
    assert.equal(selectListView.getSelectedItem(), items[1])

    await selectListView.update({query: 'Jon'})
    assert.equal(selectListView.refs.items.innerText, 'Joanna\nJohnathan')
    assert.equal(selectListView.getSelectedItem(), items[2])
  })

  it('custom filtering', async () => {
    const items = [{name: 'Elizabeth'}, {name: 'Johnathan'}, {name: 'Joanna'}]
    const selectListView = new SelectListView({
      items,
      filterQuery: (query) => query[0],
      filter: (items, query) => {
        if (query) {
          const index = Number(query)
          return [items[index]]
        } else {
          return items
        }
      },
      elementForItem: (item) => createElementForItem(item)
    })
    containerNode.appendChild(selectListView.element)
    await selectListView.selectLast()
    assert.equal(selectListView.refs.items.innerText, 'Elizabeth\nJohnathan\nJoanna')
    assert.equal(selectListView.getSelectedItem(), items[2])

    await selectListView.update({query: '1z'})
    assert.equal(selectListView.refs.items.innerText, 'Johnathan')
    assert.equal(selectListView.getSelectedItem(), items[1])
  })

  it('ordering', async () => {
    const items = [{name: 'Grace'}, {name: 'Brad'}, {name: 'Steve'}]
    const selectListView = new SelectListView({
      items,
      filterKeyForItem: (item) => item.name,
      elementForItem: (item) => createElementForItem(item),
      order: (a, b) => a.name.localeCompare(b.name)
    })
    containerNode.appendChild(selectListView.element)
    assert.equal(selectListView.refs.items.innerText, 'Brad\nGrace\nSteve')
    assert.equal(selectListView.getSelectedItem(), items[1])

    await selectListView.update({query: 'e'})
    assert.equal(selectListView.refs.items.innerText, 'Grace\nSteve')
    assert.equal(selectListView.getSelectedItem(), items[0])
  })

  it('query changes', async () => {
    const queryChangeEvents = []
    const selectListView = new SelectListView({
      didChangeQuery: (query) => queryChangeEvents.push(query),
      items: [],
      elementForItem: (i) => document.createElement('li')
    })
    assert.deepEqual(queryChangeEvents, [])
    await selectListView.update({query: 'abc'})
    assert.deepEqual(queryChangeEvents, ['abc'])
    await selectListView.update({query: ''})
    assert.deepEqual(queryChangeEvents, ['abc', ''])
  })

  it('empty message', async () => {
    const selectListView = new SelectListView({
      emptyMessage: 'empty message',
      items: [],
      elementForItem: (i) => document.createElement('li')
    })
    assert.equal(selectListView.refs.emptyMessage.textContent, 'empty message')
    await selectListView.update({items: [1, 2, 3]})
    assert(!selectListView.refs.emptyMessage)
  })

  it('error message', async () => {
    const selectListView = new SelectListView({
      errorMessage: 'error message',
      items: [],
      elementForItem: (i) => document.createElement('li')
    })
    assert.equal(selectListView.refs.errorMessage.textContent, 'error message')
    await selectListView.update({items: [1, 2, 3]})
    assert.equal(selectListView.refs.errorMessage.textContent, 'error message')
    await selectListView.update({errorMessage: null})
    assert(!selectListView.refs.errorMessage)
  })

  it('info message', async () => {
    const selectListView = new SelectListView({
      infoMessage: 'info message',
      items: [],
      elementForItem: (i) => document.createElement('li')
    })
    assert.equal(selectListView.refs.infoMessage.textContent, 'info message')
    await selectListView.update({items: [1, 2, 3]})
    assert.equal(selectListView.refs.infoMessage.textContent, 'info message')
    await selectListView.update({infoMessage: null})
    assert(!selectListView.refs.infoMessage)
  })

  it('loading message', async () => {
    const selectListView = new SelectListView({
      loadingMessage: 'loading message',
      emptyMessage: 'empty message',
      loadingBadge: '4',
      items: [],
      elementForItem: (i) => document.createElement('li')
    })
    assert(!selectListView.refs.emptyMessage)
    assert.equal(selectListView.refs.loadingMessage.textContent, 'loading message')
    assert.equal(selectListView.refs.loadingBadge.textContent, '4')
    await selectListView.update({loadingBadge: null})
    assert(!selectListView.refs.emptyMessage)
    assert.equal(selectListView.refs.loadingMessage.textContent, 'loading message')
    assert(!selectListView.refs.loadingBadge)
    await selectListView.update({loadingMessage: null})
    assert.equal(selectListView.refs.emptyMessage.textContent, 'empty message')
    assert(!selectListView.refs.loadingMessage)
    assert(!selectListView.refs.loadingBadge)
  })

  it('items class list', async () => {
    const selectListView = new SelectListView({
      itemsClassList: ['a', 'b'],
      items: [],
      elementForItem: (i) => document.createElement('li')
    })
    await selectListView.update({items: [1, 2, 3]})
    assert(selectListView.refs.items.classList.contains('a'))
    assert(selectListView.refs.items.classList.contains('b'))
    await selectListView.update({itemsClassList: ['c']})
    assert(!selectListView.refs.items.classList.contains('a'))
    assert(!selectListView.refs.items.classList.contains('b'))
    assert(selectListView.refs.items.classList.contains('c'))
  })

  it('allows the scheduler to be accessed', async () => {
    const items = [{name: 'Grace'}, {name: 'John'}, {name: 'Peter'}]
    const selectListView = new SelectListView({
      items,
      elementForItem: (item) => createElementForItem(item)
    })
    containerNode.appendChild(selectListView.element)
    assert.equal(selectListView.refs.items.innerText, 'Grace\nJohn\nPeter')

    items.pop()
    const promise = selectListView.update({items})
    assert.equal(SelectListView.getScheduler().getNextUpdatePromise(), promise)

    await promise
    assert.equal(selectListView.refs.items.innerText, 'Grace\nJohn')
  })

  describe('elementForItem', () => {
    it('passes whether the item is selected', async () => {
      const elementForItem = sandbox.stub().callsFake(() => document.createElement('div'))
      const selectListView = new SelectListView({
        items: ['foo', 'bar'],
        elementForItem,
      })

      assert(elementForItem.calledWithMatch('foo', {selected: true}))
      assert(elementForItem.calledWithMatch('bar', {selected: false}))
    })

    it('passes the item\'s index', () => {
      const elementForItem = sandbox.stub().callsFake(() => document.createElement('div'))
      const selectListView = new SelectListView({
        items: ['foo', 'bar'],
        elementForItem,
      })

      assert(elementForItem.calledWithMatch('foo', {index: 0}))
      assert(elementForItem.calledWithMatch('bar', {index: 1}))
    })

    it('called for old and new selected item only on keyboard navigation', async () => {
      const props = {
        items: ['Grace', 'John', 'Peter'],
        elementForItem: createElementForItem
      }
      const spy = sinon.spy(props, "elementForItem")
      const selectListView = new SelectListView(props)
      containerNode.appendChild(selectListView.element)

      assert.equal(selectListView.refs.items.innerText, 'Grace\nJohn\nPeter')
      assert.equal(spy.callCount, 3)
      assert(spy.calledWithExactly("Grace", {selected: true, index: 0, visible: true}))
      assert(spy.calledWithExactly("John", {selected: false, index: 1, visible: true}))
      assert(spy.calledWithExactly("Peter", {selected: false, index: 2, visible: true}))

      spy.reset()
      await selectListView.selectNext()
      assert.equal(spy.callCount, 2)
      assert(spy.calledWithExactly("Grace", {selected: false, index: 0, visible: true}))
      assert(spy.calledWithExactly("John", {selected: true, index: 1, visible: true}))

      spy.reset()
      await selectListView.selectNext()
      assert.equal(spy.callCount, 2)
      assert(spy.calledWithExactly("John", {selected: false, index: 1, visible: true}))
      assert(spy.calledWithExactly("Peter", {selected: true, index: 2, visible: true}))

      spy.reset()
      await selectListView.selectPrevious()
      assert.equal(spy.callCount, 2)
      assert(spy.calledWithExactly("John", {selected: true, index: 1, visible: true}))
      assert(spy.calledWithExactly("Peter", {selected: false, index: 2, visible: true}))

      spy.reset()
      await selectListView.selectPrevious()
      assert.equal(spy.callCount, 2)
      assert(spy.calledWithExactly("Grace", {selected: true, index: 0, visible: true}))
      assert(spy.calledWithExactly("John", {selected: false, index: 1, visible: true}))
    })
  })

  describe('getItemForElement', () => {
    it('return source item of passed element', async () => {
      const selectListView = new SelectListView({
        items: [{name:'foo'}, {name: 'bar'}, {name: 'baz'}],
        elementForItem: createElementForItem,
      })
      const elements = selectListView.element.querySelectorAll('.item')
      assert.equal(selectListView.getItemForElement(elements[0]), selectListView.items[0])
      assert.equal(selectListView.getItemForElement(elements[1]), selectListView.items[1])
      assert.equal(selectListView.getItemForElement(elements[1]), selectListView.items[1])
    })

    it('return `undefined` when passed element was not found', async () => {
      const selectListView = new SelectListView({
        items: [{name:'foo'}, {name: 'bar'}, {name: 'baz'}],
        elementForItem: createElementForItem,
      })
      const elements = selectListView.element.querySelectorAll('.item')
      assert.equal(selectListView.getItemForElement(undefined), undefined)
      assert.equal(selectListView.getItemForElement(null), undefined)
      assert.equal(selectListView.getItemForElement(false), undefined)
      assert.equal(selectListView.getItemForElement(document.createElement('li')), undefined)
    })

    it('does not throw exception when it does not have any items', async () => {
      const selectListView = new SelectListView({
        items: [],
        elementForItem: createElementForItem,
      })
      assert.doesNotThrow(() => selectListView.getItemForElement(document.createElement("li")))
    })
  })

  it('changing and selecting the query', async () => {
    let selectListView = new SelectListView({
      itemsClassList: [], items: [],
      elementForItem: (i) => document.createElement('li')
    })

    await selectListView.update({query: 'test q'})
    assert.equal(selectListView.getQuery(), 'test q')
    assert.equal(selectListView.refs.queryEditor.getSelectedText(), '')

    await selectListView.update({query: 'test q2', selectQuery: true})
    assert.equal(selectListView.getQuery(), 'test q2')
    assert.equal(selectListView.refs.queryEditor.getSelectedText(), 'test q2')

    await selectListView.update({query: 'test q3', selectQuery: false})
    assert.equal(selectListView.getQuery(), 'test q3')
    assert.equal(selectListView.refs.queryEditor.getSelectedText(), '')

    await selectListView.update({selectQuery: true})
    assert.equal(selectListView.getQuery(), 'test q3')
    assert.equal(selectListView.refs.queryEditor.getSelectedText(), 'test q3')
  })

  describe('initiallyVisibleItemCount', () => {
    let spy, items

    const TIMEOUT = 100
    const assertItemsBecomeVisible = async itemIndexes => {
      spy.reset()
      await new Promise(resolve => setTimeout(resolve, TIMEOUT))
      assert.equal(spy.callCount, itemIndexes.length)
      for (const index of itemIndexes) {
        assert(spy.calledWithExactly(items[index], {selected: false, index, visible: true}))
      }
    }
    createElementForItemSpyWithHeight = height => {
      return sinon.spy((item, {selected, index, visible}) => {
        const element = document.createElement('li')
        element.textContent = item
        element.style.height = height
        element.className = 'item'
        if (visible) element.classList.add("visible")
        return element
      })
    }

    beforeEach(() => {
      items = []
      for (let i = 0; i < 100; i++) items.push(String(i))
    })

    it('case-1: initially renders only specified number of items and renders others as they become visible', async () => {
      spy = createElementForItemSpyWithHeight("30px")
      const selectListView = new SelectListView({
        items: items,
        initiallyVisibleItemCount: 5,
        initialSelectionIndex: undefined,
        elementForItem: spy,
      })
      assert.equal(selectListView.element.querySelectorAll('.item').length, 100)
      assert.equal(selectListView.element.querySelectorAll('.item.visible').length, 5)
      selectListView.element.style.overflowY = 'auto'
      selectListView.element.style.height = '150px'

      containerNode.appendChild(selectListView.element)

      const children = selectListView.refs.items.children
      children[20].scrollIntoViewIfNeeded()
      await assertItemsBecomeVisible([17, 18, 19, 20, 21, 22, 23])
      children[50].scrollIntoViewIfNeeded()
      await assertItemsBecomeVisible([47, 48, 49, 50, 51, 52, 53])
      children[80].scrollIntoViewIfNeeded()
      await assertItemsBecomeVisible([77, 78, 79, 80, 81, 82, 83])
      children[90].scrollIntoViewIfNeeded()
      await assertItemsBecomeVisible([87, 88, 89, 90, 91, 92, 93])

      children[20].scrollIntoViewIfNeeded()
      await assertItemsBecomeVisible([])
      children[50].scrollIntoViewIfNeeded()
      await assertItemsBecomeVisible([])
      children[80].scrollIntoViewIfNeeded()
      await assertItemsBecomeVisible([])
      children[90].scrollIntoViewIfNeeded()
      await assertItemsBecomeVisible([])
      assert.equal(selectListView.element.querySelectorAll('.item').length, 100)
      assert.equal(selectListView.element.querySelectorAll('.item.visible').length, 33)
    })

    it('case-2: initially renders only specified number of items and renders others as they become visible', async () => {
      spy = createElementForItemSpyWithHeight("10px")
      const selectListView = new SelectListView({
        items: items,
        initiallyVisibleItemCount: 5,
        initialSelectionIndex: undefined,
        elementForItem: spy,
      })
      assert.equal(selectListView.element.querySelectorAll('.item').length, 100)
      assert.equal(selectListView.element.querySelectorAll('.item.visible').length, 5)
      selectListView.element.style.overflowY = 'auto'
      selectListView.element.style.height = '10px'

      containerNode.appendChild(selectListView.element)

      const children = selectListView.refs.items.children
      children[20].scrollIntoViewIfNeeded()
      await assertItemsBecomeVisible([19, 20, 21])
      children[50].scrollIntoViewIfNeeded()
      await assertItemsBecomeVisible([49, 50, 51])
      children[80].scrollIntoViewIfNeeded()
      await assertItemsBecomeVisible([79, 80, 81])
      children[90].scrollIntoViewIfNeeded()
      await assertItemsBecomeVisible([89, 90, 91])

      children[20].scrollIntoViewIfNeeded()
      await assertItemsBecomeVisible([])
      children[50].scrollIntoViewIfNeeded()
      await assertItemsBecomeVisible([])
      children[80].scrollIntoViewIfNeeded()
      await assertItemsBecomeVisible([])
      children[90].scrollIntoViewIfNeeded()
      await assertItemsBecomeVisible([])
      assert.equal(selectListView.element.querySelectorAll('.item').length, 100)
      assert.equal(selectListView.element.querySelectorAll('.item.visible').length, 17)
    })
  })
})

function createElementForItem (item) {
  const element = document.createElement('li')
  element.style.height = '10px'
  element.className = 'item'
  element.textContent = item.name || item
  return element
}
