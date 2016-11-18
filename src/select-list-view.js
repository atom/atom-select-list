/** @jsx etch.dom */

const etch = require('etch')

module.exports = class SelectListView {
  constructor (props) {
    this.selectionIndex = 0
    this.props = props
    if (this.props.didChangeSelection) {
      this.props.didChangeSelection(this.getSelectedItem())
    }
    etch.initialize(this)
    if (global.atom) {
      this.registerAtomCommands()
    }
  }

  registerAtomCommands () {
    global.atom.commands.add(this.element, {
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
    if (props.items) {
      this.props.items = props.items
    }

    return etch.update(this)
  }

  render () {
    if (this.props.items.length > 0) {
      return (
        <ul ref='items'>
        {this.props.items.map((item) =>
          <ListItemView
            item={this.props.viewForItem(item)}
            selected={this.getSelectedItem() === item} />
        )}
        </ul>
      )
    } else {
      return (
        <div>
          <span ref="emptyMessage">{this.props.emptyMessage}</span>
        </div>
      )
    }
  }

  getSelectedItem () {
    return this.props.items[this.selectionIndex]
  }

  selectPrevious () {
    this.selectionIndex = this.selectionIndex === 0 ? this.props.items.length - 1 : this.selectionIndex - 1
    if (this.props.didChangeSelection) {
      this.props.didChangeSelection(this.getSelectedItem())
    }
    return this.update()
  }

  selectNext () {
    this.selectionIndex = this.selectionIndex === this.props.items.length - 1 ? 0 : this.selectionIndex + 1
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
    this.selectionIndex = this.props.items.length - 1
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
