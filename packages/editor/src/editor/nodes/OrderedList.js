import { wrappingInputRule } from 'prosemirror-inputrules'
import toggleList from '../commands/toggleList'
import Node from '../lib/Node'

export default class OrderedList extends Node {
    get name() {
        return 'ordered_list'
    }

    get schema() {
        return {
            attrs: {
                order: {
                    default: 1,
                },
            },
            content: 'list_item+',
            group: 'block',
            parseDOM: [
                {
                    tag: 'ol',
                    getAttrs: (dom) => ({
                        order: dom.hasAttribute('start') ? parseInt(dom.getAttribute('start') || '1', 10) : 1,
                    }),
                },
            ],
            toDOM: (node) => (node.attrs.order === 1 ? ['ol', { class: 'ac-ol' }, 0] : ['ol', { class: 'ac-ol', start: node.attrs.order }, 0]),
        }
    }

    commands({ type, schema }) {
        return () => toggleList(type, schema.nodes.list_item)
    }

    // keys({ type, schema }) {
    //   return {
    //     "Shift-Ctrl-9": toggleList(type, schema.nodes.list_item),
    //   };
    // }

    inputRules({ type }) {
        return [
            wrappingInputRule(
                /^(\d+)\.\s$/,
                type,
                (match) => ({ order: +match[1] }),
                (match, node) => node.childCount + node.attrs.order === +match[1]
            ),
        ]
    }

    toMarkdown(state, node) {
        const start = node.attrs.order || 1
        const maxW = `${start + node.childCount - 1}`.length
        const space = state.repeat(' ', maxW + 2)

        state.renderList(node, space, (i) => {
            const nStr = `${start + i}`
            return state.repeat(' ', maxW - nStr.length) + nStr + '. '
        })
    }

    parseMarkdown() {
        return { block: 'ordered_list' }
    }
}
