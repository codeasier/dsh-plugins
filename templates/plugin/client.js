window.__ModuleLoader__.load({
  id: '__PACKAGE_NAME__',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    const inject = ['slots']

    function Badge() {
      return h(
        'div',
        {
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 8px',
            borderRadius: '999px',
            fontSize: '12px',
            color: 'var(--dsw-alias-text-secondary)',
            background: 'var(--dsw-alias-bg-secondary)',
          },
        },
        h('span', { 'aria-hidden': true }, '◆'),
        h('span', null, '__TITLE__'),
      )
    }

    function apply(ctx) {
      ctx.slots.inject('conversation.composer.dock', () =>
        ctx.slots.register(
          {
            name: 'conversation.composer.dock',
            id: '__ROW_ID__',
            order: 50,
          },
          Badge,
        ),
      )
    }

    return { inject, apply }
  },
})
