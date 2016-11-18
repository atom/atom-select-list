/** @jsx etch.dom */

const assert = require('assert')
const etch = require('etch')
const SelectListView = require('../src/select-list-view')

suite('SelectListView', () => {
  afterEach(() => {
    document.body.innerHTML = ""
  })

  test('items rendering', async () => {
    const items = [{name: 'Grace', age: 20}, {name: 'John', age: 42}]
    const selectListView = new SelectListView({
      items,
      viewForItem: (item) => <div><span>{item.name}</span> <span>{item.age}</span></div>
    })
    document.body.appendChild(selectListView.element)
    assert.equal(selectListView.refs.items.innerText, 'Grace 20\nJohn 42')

    items.push({name: 'Peter', age: '50'})
    await selectListView.update({items})
    assert.equal(selectListView.refs.items.innerText, 'Grace 20\nJohn 42\nPeter 50')

    await etch.destroy(selectListView)
  })

  test('keyboard navigation and selection', async () => {
    const selectionConfirmEvents = []
    const selectionChangeEvents = []
    const items = [{name: 'Grace'}, {name: 'John'}, {name: 'Peter'}]
    const selectListView = new SelectListView({
      items,
      viewForItem: (item) => <div>{item.name}</div>,
      didChangeSelection: (item) => { selectionChangeEvents.push(item) },
      didConfirmSelection: (item) => { selectionConfirmEvents.push(item) }
    })
    document.body.appendChild(selectListView.element)
    assert.equal(selectListView.getSelectedItem(), items[0])
    assert.equal(selectListView.element.querySelector('.selected').textContent, items[0].name)

    await selectListView.selectNext()
    assert.equal(selectListView.getSelectedItem(), items[1])
    assert.equal(selectListView.element.querySelector('.selected').textContent, items[1].name)
    await selectListView.selectNext()
    assert.equal(selectListView.getSelectedItem(), items[2])
    assert.equal(selectListView.element.querySelector('.selected').textContent, items[2].name)
    await selectListView.selectNext()
    assert.equal(selectListView.getSelectedItem(), items[0])
    assert.equal(selectListView.element.querySelector('.selected').textContent, items[0].name)

    await selectListView.selectPrevious()
    assert.equal(selectListView.getSelectedItem(), items[2])
    assert.equal(selectListView.element.querySelector('.selected').textContent, items[2].name)
    await selectListView.selectPrevious()
    assert.equal(selectListView.getSelectedItem(), items[1])
    assert.equal(selectListView.element.querySelector('.selected').textContent, items[1].name)
    await selectListView.selectPrevious()
    assert.equal(selectListView.getSelectedItem(), items[0])
    assert.equal(selectListView.element.querySelector('.selected').textContent, items[0].name)

    await selectListView.selectLast()
    assert.equal(selectListView.getSelectedItem(), items[2])
    assert.equal(selectListView.element.querySelector('.selected').textContent, items[2].name)
    await selectListView.selectFirst()
    assert.equal(selectListView.getSelectedItem(), items[0])
    assert.equal(selectListView.element.querySelector('.selected').textContent, items[0].name)

    assert.deepEqual(selectionConfirmEvents, [])
    assert(selectListView.element.parentElement)
    await selectListView.confirmSelection()
    assert.deepEqual(selectionConfirmEvents, [items[0]])
    assert(!selectListView.element.parentElement)

    assert.deepEqual(selectionChangeEvents, [items[0], items[1], items[2], items[0], items[2], items[1], items[0], items[2], items[0]])
  })

  test('empty message', async () => {
    const selectListView = new SelectListView({emptyMessage: 'empty message', items: [], viewForItem: (i) => i.toString()})
    assert.equal(selectListView.refs.emptyMessage.textContent, 'empty message')
    await selectListView.update({items: [1, 2, 3]})
    assert(!selectListView.refs.emptyMessage)
  })

  test('error message')
  test('info message')
  test('items filtering')
  test('query changes')
  test('focus')
  test('destroy')
})
