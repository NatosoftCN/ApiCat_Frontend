import { splitListItem, sinkListItem, liftListItem } from 'prosemirror-schema-list'
import { Plugin, TextSelection } from 'prosemirror-state'
import { DecorationSet, Decoration } from 'prosemirror-view'
import { findParentNodeClosestToPos } from 'prosemirror-utils'

import Node from '../lib/Node'
import { isInList, getParentListItem } from '../utils'

export default class ListItem extends Node {
    get name() {
        return 'list_item'
    }

    get schema() {
        return {
            content: 'paragraph block*',
            defining: true,
            draggable: true,
            parseDOM: [{ tag: 'li' }],
            toDOM: () => ['li', 0],
        }
    }

    get plugins() {
        return [
            new Plugin({
                state: {
                    init() {
                        return DecorationSet.empty
                    },
                    apply: (tr, set, oldState, newState) => {
                        const action = tr.getMeta('li')
                        if (!action && !tr.docChanged) {
                            return set
                        }

                        // Adjust decoration positions to changes made by the transaction
                        set = set.map(tr.mapping, tr.doc)

                        switch (action?.event) {
                            case 'mouseover': {
                                const result = findParentNodeClosestToPos(
                                    newState.doc.resolve(action.pos),
                                    (node) => node.type.name === this.name || node.type.name === 'checkbox_item'
                                )

                                if (!result) {
                                    return set
                                }

                                return DecorationSet.create(tr.doc, [
                                    Decoration.node(result.pos, result.pos + result.node.nodeSize, {
                                        class: 'hovering',
                                    }),
                                ])
                            }
                            case 'mouseout': {
                                const result = findParentNodeClosestToPos(
                                    newState.doc.resolve(action.pos),
                                    (node) => node.type.name === this.name || node.type.name === 'checkbox_item'
                                )

                                if (!result) {
                                    return set
                                }

                                return set.remove(set.find(result.pos, result.pos + result.node.nodeSize))
                            }
                            default:
                        }

                        return set
                    },
                },
                props: {
                    decorations(state) {
                        return this.getState(state)
                    },
                    handleDOMEvents: {
                        mouseover: (view, event) => {
                            const { state, dispatch } = view
                            const target = event.target
                            const li = target?.closest('li')
                            if (!li) {
                                return false
                            }
                            const pos = view.posAtDOM(li, 0)
                            if (!pos) {
                                return false
                            }

                            dispatch(
                                state.tr.setMeta('li', {
                                    event: 'mouseover',
                                    pos,
                                })
                            )
                            return false
                        },
                        mouseout: (view, event) => {
                            const { state, dispatch } = view
                            const target = event.target
                            const li = target?.closest('li')
                            if (!li) {
                                return false
                            }
                            const pos = view.posAtDOM(li, 0)
                            if (!pos) {
                                return false
                            }

                            dispatch(
                                state.tr.setMeta('li', {
                                    event: 'mouseout',
                                    pos,
                                })
                            )
                            return false
                        },
                    },
                },
            }),
        ]
    }

    keys({ type }) {
        return {
            Enter: splitListItem(type),
            Tab: sinkListItem(type),
            'Shift-Tab': liftListItem(type),
            'Mod-]': sinkListItem(type),
            'Mod-[': liftListItem(type),
            'Shift-Enter': (state, dispatch) => {
                if (!isInList(state)) return false
                if (!state.selection.empty) return false

                const { tr, selection } = state
                dispatch(tr.split(selection.to))
                return true
            },
            'Alt-ArrowUp': (state, dispatch) => {
                if (!state.selection.empty) return false
                const result = getParentListItem(state)
                if (!result) return false

                const [li, pos] = result
                const $pos = state.doc.resolve(pos)

                if (!$pos.nodeBefore || !['list_item', 'checkbox_item'].includes($pos.nodeBefore.type.name)) {
                    console.log('Node before not a list item')
                    return false
                }

                const { tr } = state
                const newPos = pos - $pos.nodeBefore.nodeSize

                dispatch(
                    tr
                        .delete(pos, pos + li.nodeSize)
                        .insert(newPos, li)
                        .setSelection(TextSelection.near(tr.doc.resolve(newPos)))
                )
                return true
            },
            'Alt-ArrowDown': (state, dispatch) => {
                if (!state.selection.empty) return false
                const result = getParentListItem(state)
                if (!result) return false

                const [li, pos] = result
                const $pos = state.doc.resolve(pos + li.nodeSize)

                if (!$pos.nodeAfter || !['list_item', 'checkbox_item'].includes($pos.nodeAfter.type.name)) {
                    console.log('Node after not a list item')
                    return false
                }

                const { tr } = state
                const newPos = pos + li.nodeSize + $pos.nodeAfter.nodeSize

                dispatch(
                    tr
                        .insert(newPos, li)
                        .setSelection(TextSelection.near(tr.doc.resolve(newPos)))
                        .delete(pos, pos + li.nodeSize)
                )
                return true
            },
        }
    }

    toMarkdown(state, node) {
        state.renderContent(node)
    }

    parseMarkdown() {
        return { block: 'list_item' }
    }
}
