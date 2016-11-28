/** @babel */

const assert = require('assert')
const etch = require('etch')
const SelectListView = require('../src/select-list-view')

describe('SelectListView', () => {
  let containerNode = null

  beforeEach(() => {
    containerNode = document.createElement('div')
    document.body.appendChild(containerNode)
  })

  afterEach(() => {
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

    assert.deepEqual(selectionConfirmEvents, [])
    assert(selectListView.element.parentElement)
    await selectListView.confirmSelection()
    assert.deepEqual(selectionConfirmEvents, [items[0]])
    assert.deepEqual(selectionChangeEvents, [items[0], items[1], items[2], items[0], items[2], items[1], items[0], items[2], items[0]])
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
    assert.deepEqual(selectionConfirmEvents, [items[1]])
    assert.deepEqual(selectionChangeEvents, [items[0], items[1]])
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

    selectListView.refs.queryEditor.setText('Jon')
    await etch.getScheduler().getNextUpdatePromise()
    assert.equal(selectListView.refs.items.innerText, 'Joanna\nJohnathan')
    assert.equal(selectListView.getSelectedItem(), items[2])
  })

  it('custom filtering', async () => {
    const items = [{name: 'Elizabeth'}, {name: 'Johnathan'}, {name: 'Joanna'}]
    const selectListView = new SelectListView({
      items,
      filter: (items, query) => {
        if (query === '') {
          return items
        } else {
          const index = Number(selectListView.getQuery())
          return [items[index]]
        }
      },
      elementForItem: (item) => createElementForItem(item)
    })
    containerNode.appendChild(selectListView.element)
    await selectListView.selectLast()
    assert.equal(selectListView.refs.items.innerText, 'Elizabeth\nJohnathan\nJoanna')
    assert.equal(selectListView.getSelectedItem(), items[2])

    selectListView.refs.queryEditor.setText('1')
    await etch.getScheduler().getNextUpdatePromise()
    assert.equal(selectListView.refs.items.innerText, 'Johnathan')
    assert.equal(selectListView.getSelectedItem(), items[1])
  })

  it('query changes', async () => {
    const queryChangeEvents = []
    const selectListView = new SelectListView({
      didChangeQuery: (query) => queryChangeEvents.push(query),
      items: [],
      elementForItem: (i) => document.createElement('li')
    })
    assert.deepEqual(queryChangeEvents, [])
    selectListView.refs.queryEditor.setText('abc')
    assert.deepEqual(queryChangeEvents, ['abc'])
    selectListView.refs.queryEditor.setText('')
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
})

function createElementForItem (item) {
  const element = document.createElement('li')
  element.style.height = '10px'
  element.className = 'item'
  element.textContent = item.name
  return element
}
