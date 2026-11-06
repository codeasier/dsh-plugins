window.__ModuleLoader__.load({
  id: '@codeasier/dsh-plugin-web-providers',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports

    const React = require('react')
    const h = React.createElement

    /**
     * User-visible text, resolved through the shell's locale service so the
     * page follows the app language instead of shipping one language.
     */
    const MESSAGES = {
      en: {
        'page.title': 'Web search / fetch',
        'page.lead':
          'Choose the providers behind web_search and web_fetch. A save applies on the next call.',
        'page.loading': 'Loading…',
        'page.unavailable':
          'This host does not serve the web-providers settings; check that the plugin is mounted in this profile.',
        'page.footnote': "Field meanings and the credential order are in the plugin's README.md.",
        'kind.search.title': 'Search',
        'kind.search.hint': 'web_search uses the provider selected here.',
        'kind.fetch.title': 'Fetch',
        'kind.fetch.hint': 'web_fetch uses the provider selected here.',
        'a11y.activeFor': 'Provider in use for {kind}',
        'action.edit': 'Edit',
        'action.delete': 'Delete',
        'action.collapse': 'Collapse',
        'action.save': 'Save',
        'action.saving': 'Saving…',
        'action.cancel': 'Cancel',
        'action.revert': 'Revert',
        'action.addProvider': 'Add provider',
        'label.name': 'Name',
        'label.displayName': 'Display name',
        'label.displayNameHint': 'Optional, shown in diagnostics',
        'label.vendor': 'Vendor',
        'label.vendorAria': 'Vendor',
        'label.endpoint': 'Endpoint',
        'label.address': 'Address',
        'label.addressHint':
          '{query} is replaced with the query and {max} with the result count. With no placeholder, a trailing / appends the value to the path, otherwise ?q= is added. Fetch templates use {url}.',
        'label.key': 'Key',
        'label.keyHint':
          'Paste it here; no environment variable needed. It is written into the profile file (mode 600).',
        'label.keyType': 'Credential type',
        'label.credentialName': 'Credential name',
        'label.credentialNameHint':
          'Looks the key up by name in ~/.dsh/.credentials.yaml, which works when the desktop app is launched from the Dock; the environment is only a fallback and no key is stored in the profile.',
        'label.results': 'Results',
        'label.timeout': 'Timeout',
        'label.advanced': 'Advanced',
        'label.otherFields': 'Other fields (JSON)',
        'label.active': 'In use',
        'label.badgeActive': 'Active',
        'label.duplicate': 'Duplicate',
        'label.unnamed': 'Unnamed',
        'label.unselected': 'Not selected',
        'label.unconfigured': 'Not configured',
        'label.autoUnspecified': 'Auto (unspecified)',
        'label.autoOnly': 'Auto (only entry)',
        'label.notConfiguredYet': 'No providers yet; add one to start using it.',
        'label.duplicateHint': 'Same id as an earlier provider; only the first one takes effect.',
        'warn.looksLikeName':
          'This looks like a credential name, not a key: switch the type on the left to “Credential name”.',
        'warn.looksLikeSecret':
          'This looks like a key itself: switch the type on the left to “Key”, or write an UPPER_SNAKE credential name here.',
        'warn.bothSet':
          'This entry stores both a key and a credential name; the key wins at runtime. Saving here keeps only the current type.',
        'status.saved': 'Saved — applies on the next call.',
        'status.rejected': 'The host rejected the write; reload and retry.',
        'status.auto': 'Switched to automatic selection.',
        'status.switched': 'Switched to {id}; applies on the next call.',
        'status.switchRejected': 'The switch was rejected; reload and retry.',
        'error.jsonObject': 'must be a JSON object',
        'vendor.url': 'Custom URL',
        'vendor.httpJson': 'http-json (manual field mapping)',
        'vendor.http': 'http (plain fetch)',
        'field.url': 'Request address',
        'field.method': 'Method',
        'field.queryParam': 'Query parameter',
        'field.resultsPath': 'Results path',
        'field.urlField': 'URL field',
        'field.titleField': 'Title field',
        'field.snippetField': 'Snippet field',
        'field.contentField': 'Content field',
        'field.maxBodyChars': 'Content length cap',
        'field.cx': 'Search engine ID',
        'field.searchDepth': 'Search depth',
        'field.includeAnswer': 'Answer summary',
        'field.default': 'Default',
        'field.defaultYes': 'Default (yes)',
        'field.no': 'No',
        'field.channel': 'Channel',
        'field.channelHint':
          'Channel ids come from the gateway: ag, tavily, brave-search, exa, searxng, google-pse, linkup, searchapi, youcom, xquik…',
        'field.searchType': 'Search type',
        'field.searchTypeDefault': 'Default (web)',
        'field.channelOptions': 'Channel options',
        'field.authHeader': 'Auth header',
        'field.authPrefix': 'Auth prefix',
        'field.autoWhenBlank': 'auto when blank',
      },
      zh: {
        'page.title': 'Web 搜索/抓取',
        'page.lead': '为 web_search 与 web_fetch 选择供应商；保存后下一次调用生效。',
        'page.loading': '读取配置中…',
        'page.unavailable': '宿主当前没有提供 web-providers 配置项，请确认插件已挂载到此 profile。',
        'page.footnote': '各供应商的字段含义与凭据解析顺序见插件的 README.md。',
        'kind.search.title': '搜索',
        'kind.search.hint': 'web_search 使用这里选中的供应商。',
        'kind.fetch.title': '抓取',
        'kind.fetch.hint': 'web_fetch 使用这里选中的供应商。',
        'a11y.activeFor': '当前用于 {kind} 的供应商',
        'action.edit': '编辑',
        'action.delete': '删除',
        'action.collapse': '收起',
        'action.save': '保存',
        'action.saving': '保存中…',
        'action.cancel': '取消',
        'action.revert': '撤销',
        'action.addProvider': '添加供应商',
        'label.name': '名称',
        'label.displayName': '显示名称',
        'label.displayNameHint': '可选，用于诊断信息',
        'label.vendor': '供应商',
        'label.vendorAria': '供应商 vendor',
        'label.endpoint': '接口地址',
        'label.address': '地址',
        'label.addressHint':
          '{query} 会替换成搜索词，{max} 替换成结果数；没写占位符时：末尾带 / 就往路径后面接，否则自动加 ?q=。抓取用 {url}。',
        'label.key': '密钥',
        'label.keyHint': '直接填在这里即可，不依赖环境变量；会写进 profile 文件（权限 600）。',
        'label.keyType': '密钥类型',
        'label.credentialName': '凭据名',
        'label.credentialNameHint':
          '从 ~/.dsh/.credentials.yaml 按名字取密钥（桌面端直接启动也有效），环境变量只是兜底；密钥不落配置文件。',
        'label.results': '结果数',
        'label.timeout': '超时',
        'label.advanced': '高级设置',
        'label.otherFields': '其他字段（JSON）',
        'label.active': '当前使用',
        'label.badgeActive': '当前',
        'label.duplicate': '重名',
        'label.unnamed': '未命名',
        'label.unselected': '未选择',
        'label.unconfigured': '未配置',
        'label.autoUnspecified': '自动（不指定）',
        'label.autoOnly': '自动（唯一一项）',
        'label.notConfiguredYet': '还没有供应商，添加一个后即可使用。',
        'label.duplicateHint': '与前面的供应商重名，只有第一个会生效。',
        'warn.looksLikeName': '这看起来是凭据名，不是密钥：把左边的类型改为「凭据名」。',
        'warn.looksLikeSecret':
          '这看起来是密钥本身：把左边的类型改为「密钥」，或在这里写 UPPER_SNAKE 形式的凭据名。',
        'warn.bothSet':
          '这条同时存了密钥和凭据名，运行时用密钥；在这里保存一次就会只留下当前类型。',
        'status.saved': '已保存，下一次调用生效。',
        'status.rejected': '写入被拒绝，请刷新后重试。',
        'status.auto': '已改为自动选择。',
        'status.switched': '已切换到 {id}，下一次调用生效。',
        'status.switchRejected': '切换被拒绝，请刷新后重试。',
        'error.jsonObject': '必须是一个 JSON 对象',
        'vendor.url': '自定义 URL',
        'vendor.httpJson': 'http-json（手动映射字段）',
        'vendor.http': 'http（普通抓取）',
        'field.url': '请求地址',
        'field.method': '方法',
        'field.queryParam': '查询参数名',
        'field.resultsPath': '结果路径',
        'field.urlField': '链接字段',
        'field.titleField': '标题字段',
        'field.snippetField': '摘要字段',
        'field.contentField': '正文字段',
        'field.maxBodyChars': '正文长度上限',
        'field.cx': '搜索引擎 ID',
        'field.searchDepth': '检索深度',
        'field.includeAnswer': '综合答案',
        'field.default': '默认',
        'field.defaultYes': '默认（是）',
        'field.no': '否',
        'field.channel': '搜索通道',
        'field.channelHint':
          '通道 id 由网关决定：ag、tavily、brave-search、exa、searxng、google-pse、linkup、searchapi、youcom、xquik…',
        'field.searchType': '搜索类型',
        'field.searchTypeDefault': '默认（web）',
        'field.channelOptions': '通道参数',
        'field.authHeader': '鉴权头',
        'field.authPrefix': '鉴权前缀',
        'field.autoWhenBlank': '不填则自动',
      },
    }

    /**
     * Translation function. `apply` rebinds it to the shell's locale service;
     * the built-in fallback keeps the module renderable outside a host.
     * @param key - message key from MESSAGES.
     * @param params - values for `{name}` placeholders.
     * @returns the resolved text.
     */
    let t = (key, params) => {
      const template = MESSAGES.en[key] ?? key
      if (params === undefined) return template
      return template.replace(/\{(\w+)\}/g, (match, name) =>
        params[name] === undefined ? match : String(params[name]),
      )
    }

    /** Settings namespace: the plugin's profile entry id. */
    const NS = 'web-providers'

    /** Cordis services this client half waits for before registering. */
    const inject = ['slots', 'configForms', 'locale']

    /**
     * Design tokens: the shell's own alias variables, so the page follows the
     * app theme (light, dark, follow-system) instead of guessing colors. Every
     * lookup keeps a literal fallback for older shells.
     */
    const T = {
      text: 'var(--dsw-alias-label-primary, #0f1115)',
      text2: 'var(--dsw-alias-label-secondary, #61666b)',
      text3: 'var(--dsw-alias-label-tertiary, #81858c)',
      caption: 'var(--dsw-alias-label-caption, #adb2b8)',
      layer1: 'var(--dsw-alias-bg-layer-1, #fff)',
      layer2: 'var(--dsw-alias-bg-layer-2, #fff)',
      soft: 'var(--dsw-specific-selector, #f5f6f7)',
      line: 'var(--dsw-alias-border-l3, rgba(0,0,0,.12))',
      lineStrong: 'var(--dsw-alias-border-l4, rgba(0,0,0,.16))',
      primary: 'var(--dsw-alias-button-primary-fill, #0f1115)',
      primaryText: 'var(--dsw-alias-label-primary-foreground, #fff)',
      danger: 'var(--dsw-alias-state-error-primary, #ec1313)',
      success: 'var(--dsw-alias-state-success-primary, #22c55e)',
      mono: 'var(--dsh-font-family-code-default, "SF Mono", Menlo, monospace)',
    }

    const SEARCH_VENDORS = [
      'url',
      '9router',
      'tavily',
      'brave',
      'exa',
      'serper',
      'searxng',
      'google-cse',
      'firecrawl',
      'jina',
      'http-json',
    ]
    const FETCH_VENDORS = ['url', 'http', 'jina', 'firecrawl', 'tavily', 'exa', 'http-json']

    /** Only the ids that are not already self-explanatory get a label. */
    const VENDOR_LABELS = {
      url: 'vendor.url',
      'http-json': 'vendor.httpJson',
      http: 'vendor.http',
    }
    const vendorLabel = (id) => (VENDOR_LABELS[id] === undefined ? id : t(VENDOR_LABELS[id]))

    const KINDS = [
      {
        key: 'search',
        titleKey: 'kind.search.title',
        hintKey: 'kind.search.hint',
        vendors: SEARCH_VENDORS,
        vendorForNew: 'url',
      },
      {
        key: 'fetch',
        titleKey: 'kind.fetch.title',
        hintKey: 'kind.fetch.hint',
        vendors: FETCH_VENDORS,
        vendorForNew: 'url',
      },
    ]

    /** Credential names are UPPER_SNAKE; anything else is probably a pasted key. */
    const CREDENTIAL_NAME = /^[A-Z][A-Z0-9_]{0,63}$/

    /** True when the value cannot be a credential name, i.e. it looks like a key. */
    const looksLikeSecret = (value) =>
      typeof value === 'string' && value.trim() !== '' && !CREDENTIAL_NAME.test(value.trim())

    /** True when the value looks like a credential name rather than a key. */
    const looksLikeName = (value) => typeof value === 'string' && CREDENTIAL_NAME.test(value.trim())

    /**
     * The key pair is exclusive at runtime (`apiKey` wins), so the form keeps
     * only one of them: writing through here always drops the other field.
     */
    const setKey = (provider, type, value) => {
      const next = { ...provider }
      delete next.apiKey
      delete next.apiKeyEnv
      if (value !== undefined && value !== '') next[type] = value
      return next
    }

    /** Which half of the pair this entry currently uses. */
    const keyTypeOf = (provider) =>
      (provider.apiKey === undefined || provider.apiKey === '') &&
      provider.apiKeyEnv !== undefined &&
      provider.apiKeyEnv !== ''
        ? 'apiKeyEnv'
        : 'apiKey'

    /** Every key the host schema understands; anything else lands in the JSON box. */
    const KNOWN = new Set([
      'id',
      'vendor',
      'label',
      'baseURL',
      'apiKey',
      'apiKeyEnv',
      'timeoutMs',
      'maxResults',
      'authHeader',
      'authPrefix',
      'model',
      'searchType',
      'providerOptions',
      'url',
      'method',
      'queryParam',
      'resultsPath',
      'urlField',
      'titleField',
      'snippetField',
      'contentField',
      'cx',
      'searchDepth',
      'includeAnswer',
      'maxBodyChars',
    ])

    /** http-json mapping fields, shown only for that vendor. */
    const HTTP_JSON_FIELDS = [
      {
        key: 'url',
        label: t('field.url'),
        placeholder: 'https://api.example.com/search?q={query}',
        full: true,
      },
      { key: 'method', label: t('field.method'), placeholder: 'GET' },
      { key: 'queryParam', label: t('field.queryParam'), placeholder: 'q' },
      { key: 'resultsPath', label: t('field.resultsPath'), placeholder: 'web.results', full: true },
      { key: 'urlField', label: t('field.urlField'), placeholder: 'url' },
      { key: 'titleField', label: t('field.titleField'), placeholder: 'title' },
      { key: 'snippetField', label: t('field.snippetField'), placeholder: 'snippet' },
      { key: 'contentField', label: t('field.contentField'), placeholder: 'data.content' },
    ]

    const S = {
      root: { display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 8, color: T.text },
      lead: { margin: 0, fontSize: 14, lineHeight: '22px', color: T.text3, maxWidth: 560 },
      titleRow: { display: 'flex', alignItems: 'center', gap: 12, minHeight: 28 },
      h2: { margin: 0, fontSize: 16, lineHeight: '24px', fontWeight: 500, color: T.text },
      section: { display: 'flex', flexDirection: 'column', gap: 10 },
      sectionHead: { display: 'flex', alignItems: 'center', gap: 12, minHeight: 28 },
      sectionTitle: { display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 },
      h3: { margin: 0, fontSize: 14, lineHeight: '22px', fontWeight: 500, color: T.text },
      hint: { margin: 0, fontSize: 12, lineHeight: '18px', color: T.text3 },
      activeBox: {
        marginLeft: 'auto',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexShrink: 0,
      },
      activeLabel: { fontSize: 12, lineHeight: '18px', color: T.text3, whiteSpace: 'nowrap' },
      list: {
        listStyle: 'none',
        margin: 0,
        padding: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      },
      card: {
        border: `1px solid ${T.lineStrong}`,
        borderRadius: 20,
        background: T.layer2,
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      },
      cardHead: { display: 'flex', alignItems: 'center', gap: 10, minHeight: 28 },
      name: {
        fontSize: 14,
        lineHeight: '22px',
        fontWeight: 500,
        color: T.text,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        minWidth: 0,
        maxWidth: '55%',
      },
      nameMuted: {
        fontSize: 14,
        lineHeight: '22px',
        fontWeight: 400,
        color: T.text3,
        whiteSpace: 'nowrap',
      },
      chips: { display: 'flex', alignItems: 'center', gap: 4, minWidth: 0, overflow: 'hidden' },
      actions: { marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 },
      chip: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        height: 20,
        padding: '0 6px',
        borderRadius: 4,
        border: `1px solid ${T.line}`,
        color: T.text2,
        fontSize: 11,
        lineHeight: '16px',
        whiteSpace: 'nowrap',
        maxWidth: 200,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      },
      chipPlain: { color: T.text },
      dot: { width: 6, height: 6, borderRadius: 999, background: T.success, flexShrink: 0 },
      panel: {
        background: T.soft,
        borderRadius: 16,
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      },
      grid: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 },
      field: { display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 },
      fieldFull: { gridColumn: '1 / -1' },
      label: {
        display: 'flex',
        alignItems: 'baseline',
        gap: 6,
        minWidth: 0,
        fontSize: 12,
        lineHeight: '18px',
        color: T.text2,
      },
      key: {
        fontFamily: T.mono,
        fontSize: 11,
        lineHeight: '16px',
        color: T.caption,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      },
      fieldHint: { fontSize: 11, lineHeight: '16px', color: T.text3 },
      fieldWarn: { fontSize: 11, lineHeight: '16px', color: T.danger },
      keyRow: { display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 },
      input: {
        boxSizing: 'border-box',
        width: '100%',
        height: 32,
        padding: '0 10px',
        borderRadius: 12,
        border: `1px solid ${T.lineStrong}`,
        background: T.layer1,
        color: T.text,
        fontFamily: 'inherit',
        fontSize: 14,
        lineHeight: '22px',
      },
      inputMono: { fontFamily: T.mono, fontSize: 13 },
      pill: {
        boxSizing: 'border-box',
        height: 32,
        padding: '0 28px 0 12px',
        borderRadius: 12,
        border: '1px solid transparent',
        background: T.soft,
        color: T.text,
        fontFamily: 'inherit',
        fontSize: 12,
        lineHeight: '18px',
      },
      area: {
        boxSizing: 'border-box',
        width: '100%',
        minHeight: 72,
        padding: '7px 10px',
        borderRadius: 12,
        border: `1px solid ${T.lineStrong}`,
        background: T.layer1,
        color: T.text,
        fontFamily: T.mono,
        fontSize: 12,
        lineHeight: '18px',
        resize: 'vertical',
      },
      foot: { display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' },
      addRow: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', minHeight: 28 },
      status: { margin: 0, fontSize: 12, lineHeight: '18px', color: T.text3 },
      error: { margin: 0, fontSize: 12, lineHeight: '18px', color: T.danger },
      empty: { margin: 0, fontSize: 13, lineHeight: '20px', color: T.text3, padding: '2px 0' },
      selectWrap: {
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        minWidth: 0,
      },
      select: { appearance: 'none', WebkitAppearance: 'none', cursor: 'pointer' },
      chevron: {
        position: 'absolute',
        right: 9,
        display: 'flex',
        pointerEvents: 'none',
        color: T.text3,
      },
      summary: {
        cursor: 'pointer',
        fontSize: 12,
        lineHeight: '18px',
        color: T.text2,
        listStyle: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      },
      advBody: { display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 12 },
      footerNote: { margin: 0, fontSize: 12, lineHeight: '18px', color: T.text3 },
    }

    /** Hover, focus and disclosure states need real rules; the rest stays inline. */
    const CSS = `
.dsh-wp, .dsh-wp * { box-sizing: border-box; }
.dsh-wp-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 4px;
  height: 28px; padding: 0 10px; border-radius: 8px;
  border: 1px solid transparent; background: transparent;
  color: var(--dsw-alias-label-primary, #0f1115);
  font-family: inherit; font-size: 12px; line-height: 18px; font-weight: 400;
  cursor: pointer; white-space: nowrap;
  transition: background-color .12s ease, border-color .12s ease, opacity .12s ease;
}
.dsh-wp-btn:disabled { opacity: .5; cursor: default; }
.dsh-wp-btn-lg { height: 36px; padding: 0 14px; border-radius: 12px; font-size: 14px; line-height: 22px; }
.dsh-wp-primary.dsh-wp-btn-sm { height: 28px; padding: 0 12px; border-radius: 8px; font-size: 12px; line-height: 18px; }
.dsh-wp-outline { border-color: var(--dsw-alias-border-l3, rgba(0,0,0,.12)); }
.dsh-wp-outline:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover, rgba(38,49,72,.06)); }
.dsh-wp-danger { color: var(--dsw-alias-state-error-primary, #ec1313); }
.dsh-wp-danger:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover-danger, rgba(236,19,19,.05)); }
.dsh-wp-primary {
  height: 36px; padding: 0 14px; border-radius: 12px; font-size: 14px; line-height: 22px;
  background: var(--dsw-alias-button-primary-fill, #0f1115);
  color: var(--dsw-alias-label-primary-foreground, #fff);
}
.dsh-wp-primary:hover:not(:disabled) { background: var(--dsw-alias-button-primary-hover, #43454a); }
.dsh-wp-input { outline: none; transition: border-color .12s ease, box-shadow .12s ease, background-color .12s ease; }
.dsh-wp-input:hover { border-color: var(--dsw-alias-border-l4, rgba(0,0,0,.16)); }
.dsh-wp-input:focus {
  border-color: var(--dsw-alias-border-l4, rgba(0,0,0,.16));
  box-shadow: 0 0 0 3px var(--dsw-alias-interactive-bg-hover, rgba(38,49,72,.06));
}
.dsh-wp-input::placeholder { color: var(--dsw-alias-label-caption, #adb2b8); }
.dsh-wp-pill:hover { background: var(--dsw-alias-interactive-bg-active, rgba(38,49,72,.1)); }
.dsh-wp-pill:focus-visible { outline: none; box-shadow: 0 0 0 3px var(--dsw-alias-interactive-bg-hover, rgba(38,49,72,.06)); }
.dsh-wp-select option { color: var(--dsw-alias-label-primary, #0f1115); background: var(--dsw-alias-bg-layer-1, #fff); }
.dsh-wp-summary::-webkit-details-marker { display: none; }
.dsh-wp-summary:hover { color: var(--dsw-alias-label-primary, #0f1115); }
.dsh-wp-summary svg { transition: transform .12s ease; }
details[open] > .dsh-wp-summary svg { transform: rotate(180deg); }
`

    const icon = (path, size) =>
      h(
        'svg',
        { width: size, height: size, viewBox: '0 0 12 12', fill: 'none', 'aria-hidden': 'true' },
        h('path', {
          d: path,
          stroke: 'currentColor',
          strokeWidth: 1.4,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        }),
      )

    const chevronIcon = (size) => icon('M3 4.5 6 7.5 9 4.5', size)
    const plusIcon = () => icon('M6 2v8M2 6h8', 12)

    /** One labelled control: Chinese label, config key as a quiet mono caption. */
    function Field({ label, field, hint, warn, full, children }) {
      return h(
        'label',
        { style: full ? { ...S.field, ...S.fieldFull } : S.field },
        h('span', { style: S.label }, label, field ? h('span', { style: S.key }, field) : null),
        children,
        hint ? h('span', { style: warn ? S.fieldWarn : S.fieldHint }, hint) : null,
      )
    }

    function TextInput({ value, placeholder, mono, onChange }) {
      return h('input', {
        className: 'dsh-wp-input',
        style: mono ? { ...S.input, ...S.inputMono } : S.input,
        type: 'text',
        value: value ?? '',
        placeholder: placeholder ?? '',
        spellCheck: false,
        autoComplete: 'off',
        onChange: (event) => onChange(event.target.value),
      })
    }

    function NumberInput({ value, placeholder, onChange }) {
      return h('input', {
        className: 'dsh-wp-input',
        style: S.input,
        type: 'text',
        inputMode: 'numeric',
        value: value === undefined || value === null ? '' : String(value),
        placeholder: placeholder ?? '',
        onChange: (event) => {
          const digits = event.target.value.replace(/[^\d]/g, '')
          onChange(digits === '' ? undefined : Number(digits))
        },
      })
    }

    /** A key typed straight into the entry: password-masked, never echoed back. */
    function SecretInput({ value, placeholder, onChange }) {
      return h('input', {
        className: 'dsh-wp-input',
        style: { ...S.input, ...S.inputMono },
        type: 'password',
        value: value ?? '',
        placeholder: placeholder ?? '',
        autoComplete: 'new-password',
        spellCheck: false,
        onChange: (event) => onChange(event.target.value),
      })
    }

    /**
     * The credential: one type selector plus one input, instead of two fields
     * that silently shadow each other. Switching the type keeps whatever is
     * already typed, so a mistake costs a switch rather than a retype.
     */
    function KeyField({ provider, onChange }) {
      const type = keyTypeOf(provider)
      const value = provider[type] ?? ''
      const both = (provider.apiKey ?? '') !== '' && (provider.apiKeyEnv ?? '') !== ''

      const warn = type === 'apiKeyEnv' ? looksLikeSecret(value) : looksLikeName(value)
      const hint = warn
        ? type === 'apiKeyEnv'
          ? t('warn.looksLikeSecret')
          : t('warn.looksLikeName')
        : both
          ? t('warn.bothSet')
          : type === 'apiKeyEnv'
            ? t('label.credentialNameHint')
            : t('label.keyHint')

      return h(
        Field,
        { label: t('label.key'), hint, warn: warn || both, full: true },
        h(
          'div',
          { style: S.keyRow },
          h(Select, {
            value: type,
            width: 96,
            ariaLabel: t('label.keyType'),
            options: [
              { value: 'apiKey', label: t('label.key') },
              { value: 'apiKeyEnv', label: t('label.credentialName') },
            ],
            onChange: (next) => onChange(setKey(provider, next, value)),
          }),
          h(
            'div',
            { style: { flex: 1, minWidth: 0 } },
            type === 'apiKey'
              ? h(SecretInput, {
                  value,
                  placeholder: 'sk-…',
                  onChange: (next) => onChange(setKey(provider, 'apiKey', next)),
                })
              : h(TextInput, {
                  value,
                  placeholder: 'MY_SEARCH_KEY',
                  mono: true,
                  onChange: (next) => onChange(setKey(provider, 'apiKeyEnv', next)),
                }),
          ),
        ),
      )
    }

    /** Native select dressed as the shell's field (`pill`) or header selector. */
    function Select({ value, options, onChange, disabled, width, ariaLabel, pill }) {
      const base = pill ? S.pill : S.input
      const box = pill
        ? { display: 'inline-flex', width: width ?? 180 }
        : { display: 'flex', width: width ?? '100%' }
      return h(
        'span',
        { style: { ...S.selectWrap, ...box, opacity: disabled ? 0.55 : 1 } },
        h(
          'select',
          {
            className: pill ? 'dsh-wp-pill dsh-wp-select' : 'dsh-wp-input dsh-wp-select',
            style: { ...base, ...S.select, width: '100%' },
            value,
            disabled: disabled === true,
            'aria-label': ariaLabel,
            onChange: (event) => onChange(event.target.value),
          },
          ...options.map((option) =>
            h('option', { key: option.value, value: option.value }, option.label),
          ),
        ),
        h('span', { style: S.chevron }, chevronIcon(12)),
      )
    }

    /** Keys the form does not model, kept round-trippable through a JSON box. */
    const unknownOf = (provider) => {
      const rest = {}
      for (const [key, value] of Object.entries(provider ?? {})) {
        if (!KNOWN.has(key)) rest[key] = value
      }
      return Object.keys(rest).length === 0 ? '' : JSON.stringify(rest, null, 2)
    }

    /** Set a key, dropping it when empty so the written YAML stays clean. */
    const put = (provider, key, value) => {
      const next = { ...provider }
      if (value === undefined || value === null || value === '') delete next[key]
      else next[key] = value
      return next
    }

    /** True when an earlier entry already claims this id. */
    const duplicated = (providers, index) =>
      providers.some(
        (provider, at) => at < index && provider.id !== '' && provider.id === providers[index].id,
      )

    function AdvancedFields({ provider, onChange }) {
      const vendor = provider.vendor
      const fields = []
      if (vendor === 'google-cse') {
        fields.push({
          key: 'cx',
          label: t('field.cx'),
          placeholder: '0123456789:abcdef',
          full: true,
        })
      } else if (vendor === 'tavily') {
        fields.push({
          key: 'searchDepth',
          label: t('field.searchDepth'),
          options: [
            { value: '', label: t('field.default') },
            { value: 'basic', label: 'basic' },
            { value: 'advanced', label: 'advanced' },
          ],
        })
        fields.push({
          key: 'includeAnswer',
          label: t('field.includeAnswer'),
          options: [
            { value: '', label: t('field.defaultYes') },
            { value: 'no', label: t('field.no') },
          ],
        })
      } else if (vendor === 'http-json') {
        fields.push(...HTTP_JSON_FIELDS)
      } else if (vendor === '9router') {
        fields.push({
          key: 'model',
          label: t('field.channel'),
          placeholder: 'ag',
          full: true,
          hint: t('field.channelHint'),
        })
        fields.push({
          key: 'searchType',
          label: t('field.searchType'),
          options: [
            { value: '', label: t('field.searchTypeDefault') },
            { value: 'web', label: 'web' },
            { value: 'news', label: 'news' },
            { value: 'x', label: 'x（Xquik）' },
          ],
        })
        fields.push({
          key: 'providerOptions',
          label: t('field.channelOptions'),
          placeholder: '{ "cx": "…" }',
          area: true,
          full: true,
        })
      } else if (vendor === 'url') {
        fields.push({
          key: 'authHeader',
          label: t('field.authHeader'),
          placeholder: 'Authorization',
        })
        fields.push({ key: 'authPrefix', label: t('field.authPrefix'), placeholder: 'Bearer' })
        fields.push({
          key: 'queryParam',
          label: t('field.queryParam'),
          placeholder: t('field.autoWhenBlank'),
        })
      }
      fields.push({ key: 'maxBodyChars', label: t('field.maxBodyChars'), placeholder: '20000' })
      fields.push({ key: 'timeoutMs', label: t('label.timeout'), placeholder: '30000' })

      return h(
        'div',
        { style: S.grid },
        ...fields.map((field) => {
          if (field.options) {
            const current =
              field.key === 'includeAnswer'
                ? provider.includeAnswer === false
                  ? 'no'
                  : ''
                : (provider[field.key] ?? '')
            return h(
              Field,
              { key: field.key, label: field.label, field: field.key },
              h(Select, {
                value: current,
                ariaLabel: field.label,
                options: field.options,
                onChange: (value) => {
                  if (field.key === 'includeAnswer')
                    onChange(put(provider, 'includeAnswer', value === 'no' ? false : undefined))
                  else onChange(put(provider, field.key, value))
                },
              }),
            )
          }
          if (field.area) {
            return h(
              Field,
              {
                key: field.key,
                label: field.label,
                field: field.key,
                full: field.full,
                hint: field.hint,
              },
              h('textarea', {
                className: 'dsh-wp-input',
                style: S.area,
                value: provider[field.key] ?? '',
                spellCheck: false,
                placeholder: field.placeholder ?? '',
                onChange: (event) => onChange(put(provider, field.key, event.target.value)),
              }),
            )
          }
          return h(
            Field,
            {
              key: field.key,
              label: field.label,
              field: field.key,
              full: field.full,
              hint: field.hint,
            },
            field.key === 'maxBodyChars' || field.key === 'timeoutMs'
              ? h(NumberInput, {
                  value: provider[field.key],
                  placeholder: field.placeholder,
                  onChange: (value) => onChange(put(provider, field.key, value)),
                })
              : h(TextInput, {
                  value: provider[field.key],
                  placeholder: field.placeholder,
                  mono: field.key !== 'method' && field.key !== 'queryParam',
                  onChange: (value) => onChange(put(provider, field.key, value)),
                }),
          )
        }),
      )
    }

    /** One provider: a summary row, and the editor while it is open. */
    function ProviderCard({
      kind,
      provider,
      index,
      providers,
      isActive,
      open,
      busy,
      onToggle,
      onClose,
      onChange,
      onRemove,
      onSave,
      onCancel,
    }) {
      const [json, setJson] = React.useState(() => unknownOf(provider))
      const [jsonError, setJsonError] = React.useState('')
      const [jsonOpen, setJsonOpen] = React.useState(false)

      React.useEffect(() => {
        if (!open) return
        setJson(unknownOf(provider))
        setJsonError('')
      }, [open])

      const commitJson = (text) => {
        setJson(text)
        const kept = {}
        for (const [key, value] of Object.entries(provider)) if (KNOWN.has(key)) kept[key] = value
        if (text.trim() === '') {
          setJsonError('')
          onChange(kept)
          return
        }
        try {
          const parsed = JSON.parse(text)
          if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed))
            throw new Error(t('error.jsonObject'))
          setJsonError('')
          onChange({ ...kept, ...parsed })
        } catch (error) {
          setJsonError(String(error?.message ?? error))
        }
      }

      const vendorOptions = (
        kind.vendors.includes(provider.vendor)
          ? kind.vendors
          : [...kind.vendors, provider.vendor ?? '']
      ).filter((vendor, at, all) => vendor !== '' && all.indexOf(vendor) === at)
      const clash = duplicated(providers, index)

      return h(
        'li',
        { style: S.card },
        h(
          'div',
          { style: S.cardHead },
          provider.id
            ? h('span', { style: S.name, title: provider.id }, provider.id)
            : h('span', { style: S.nameMuted }, t('label.unnamed')),
          h(
            'div',
            { style: S.chips },
            provider.vendor ? h('span', { style: S.chip }, vendorLabel(provider.vendor)) : null,
            provider.label ? h('span', { style: S.chip }, provider.label) : null,
            isActive
              ? h(
                  'span',
                  { style: { ...S.chip, ...S.chipPlain } },
                  h('span', { style: S.dot }),
                  t('label.badgeActive'),
                )
              : null,
            clash
              ? h(
                  'span',
                  { style: { ...S.chip, color: T.danger, borderColor: T.danger } },
                  t('label.duplicate'),
                )
              : null,
          ),
          h(
            'div',
            { style: S.actions },
            h(
              'button',
              {
                type: 'button',
                className: 'dsh-wp-btn dsh-wp-outline',
                disabled: busy,
                onClick: () => (open ? onClose() : onToggle(index)),
              },
              open ? t('action.collapse') : t('action.edit'),
            ),
            h(
              'button',
              {
                type: 'button',
                className: 'dsh-wp-btn dsh-wp-danger',
                disabled: busy,
                onClick: () => onRemove(index),
              },
              t('action.delete'),
            ),
          ),
        ),
        !open
          ? null
          : h(
              'div',
              { style: S.panel },
              h(
                'div',
                { style: S.grid },
                h(
                  Field,
                  {
                    label: t('label.name'),
                    field: 'id',
                    hint: clash ? t('label.duplicateHint') : undefined,
                  },
                  h(TextInput, {
                    value: provider.id,
                    placeholder: 'my-router',
                    mono: true,
                    onChange: (value) => onChange(put(provider, 'id', value)),
                  }),
                ),
                h(
                  Field,
                  { label: t('label.displayName'), field: 'label' },
                  h(TextInput, {
                    value: provider.label,
                    placeholder: t('label.displayNameHint'),
                    onChange: (value) => onChange(put(provider, 'label', value)),
                  }),
                ),
                h(
                  Field,
                  { label: t('label.vendor'), field: 'vendor' },
                  h(Select, {
                    value: provider.vendor ?? '',
                    ariaLabel: t('label.vendorAria'),
                    options: [
                      ...vendorOptions.map((vendor) => ({
                        value: vendor,
                        label: vendorLabel(vendor),
                      })),
                      { value: '', label: t('label.unselected') },
                    ],
                    onChange: (value) => onChange(put(provider, 'vendor', value)),
                  }),
                ),
                provider.vendor === 'url'
                  ? h(
                      Field,
                      {
                        label: t('label.address'),
                        field: 'url',
                        full: true,
                        hint: t('label.addressHint'),
                      },
                      h(TextInput, {
                        value: provider.url,
                        placeholder: 'https://s.jina.ai/{query}',
                        mono: true,
                        onChange: (value) => onChange(put(provider, 'url', value)),
                      }),
                    )
                  : h(
                      Field,
                      { label: t('label.endpoint'), field: 'baseURL', full: true },
                      h(TextInput, {
                        value: provider.baseURL,
                        placeholder: 'https://api.example.com',
                        mono: true,
                        onChange: (value) => onChange(put(provider, 'baseURL', value)),
                      }),
                    ),
                h(KeyField, { provider, onChange }),
                h(
                  Field,
                  { label: t('label.results'), field: 'maxResults' },
                  h(NumberInput, {
                    value: provider.maxResults,
                    placeholder: '8',
                    onChange: (value) => onChange(put(provider, 'maxResults', value)),
                  }),
                ),
              ),
              h(
                'details',
                { style: { display: 'flex', flexDirection: 'column', gap: 0 } },
                h(
                  'summary',
                  { className: 'dsh-wp-summary', style: S.summary },
                  chevronIcon(11),
                  t('label.advanced'),
                ),
                h(
                  'div',
                  { style: S.advBody },
                  h(AdvancedFields, { provider, onChange }),
                  h(
                    'details',
                    {
                      style: { display: 'flex', flexDirection: 'column', gap: 0 },
                      open: jsonOpen,
                      onToggle: (event) => setJsonOpen(event.currentTarget.open),
                    },
                    h(
                      'summary',
                      {
                        className: 'dsh-wp-summary',
                        style: { ...S.summary, color: T.caption, paddingLeft: 10 },
                      },
                      chevronIcon(11),
                      t('label.otherFields'),
                    ),
                    h(
                      'div',
                      {
                        style: { display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 8 },
                      },
                      h('textarea', {
                        className: 'dsh-wp-input',
                        style: S.area,
                        value: json,
                        spellCheck: false,
                        placeholder: '{ "headers": { "x-tenant": "team-a" } }',
                        onChange: (event) => commitJson(event.target.value),
                      }),
                      jsonError === '' ? null : h('span', { style: S.error }, jsonError),
                    ),
                  ),
                ),
              ),
              h(
                'div',
                { style: S.foot },
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'dsh-wp-btn dsh-wp-outline dsh-wp-btn-lg',
                    disabled: busy,
                    onClick: onCancel,
                  },
                  t('action.cancel'),
                ),
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'dsh-wp-btn dsh-wp-primary',
                    disabled: busy,
                    onClick: onSave,
                  },
                  busy ? t('action.saving') : t('action.save'),
                ),
              ),
            ),
      )
    }

    const normalize = (value) => {
      const source = value && typeof value === 'object' ? value : {}
      const providers = Array.isArray(source.providers)
        ? source.providers.map((provider) =>
            provider && typeof provider === 'object' ? { ...provider } : {},
          )
        : []
      return {
        ...source,
        active: typeof source.active === 'string' ? source.active : '',
        providers,
      }
    }

    /** Key order must not decide whether a draft counts as changed. */
    const stable = (value) => {
      if (Array.isArray(value)) return value.map(stable)
      if (value && typeof value === 'object') {
        const out = {}
        for (const key of Object.keys(value).sort()) out[key] = stable(value[key])
        return out
      }
      return value
    }

    /** What the host will really use: the named entry, else the only entry. */
    const effectiveActive = (value) => {
      const providers = value.providers
      if (value.active && providers.some((provider) => provider.id === value.active))
        return value.active
      return providers.length === 1 ? (providers[0].id ?? '') : ''
    }

    /** The settings section: both provider lists, read from the plugin namespace. */
    function WebProvidersSection({ form }) {
      const snapshot = React.useSyncExternalStore(
        (listener) => form.subscribe(listener),
        () => form.getSnapshot(),
      )
      const ready = snapshot.status === 'ready'
      const saved = ready ? (snapshot.value ?? {}) : {}

      const [draft, setDraft] = React.useState(null)
      const [openRow, setOpenRow] = React.useState('')
      const [busy, setBusy] = React.useState('')
      const [notice, setNotice] = React.useState(null)

      React.useEffect(() => {
        if (!ready || draft !== null) return
        setDraft({ search: normalize(saved.search), fetch: normalize(saved.fetch) })
      }, [ready, draft, saved])

      if (snapshot.status === 'unavailable') {
        return h(
          'div',
          { className: 'dsh-wp', style: S.root },
          h('style', null, CSS),
          h('div', { style: S.titleRow }, h('h2', { style: S.h2 }, t('page.title'))),
          h('p', { style: S.error }, t('page.unavailable')),
        )
      }
      if (!ready || draft === null) {
        return h(
          'div',
          { className: 'dsh-wp', style: S.root },
          h('style', null, CSS),
          h('div', { style: S.titleRow }, h('h2', { style: S.h2 }, t('page.title'))),
          h('p', { style: S.lead }, t('page.loading')),
        )
      }

      const restore = (kindKey) =>
        setDraft((current) => ({ ...current, [kindKey]: normalize(saved[kindKey]) }))

      const save = async (kindKey) => {
        setBusy(kindKey)
        const ok = await form.set(kindKey, draft[kindKey])
        setBusy('')
        setNotice(
          ok
            ? { kind: kindKey, tone: 'ok', text: t('status.saved') }
            : { kind: kindKey, tone: 'error', text: t('status.rejected') },
        )
        if (ok) setOpenRow('')
      }

      const applyActive = async (kindKey, id) => {
        const base = normalize(saved[kindKey])
        setBusy(kindKey)
        const ok = await form.set(kindKey, { ...base, active: id })
        setBusy('')
        setNotice(
          ok
            ? {
                kind: kindKey,
                tone: 'ok',
                text: id === '' ? t('status.auto') : t('status.switched', { id }),
              }
            : { kind: kindKey, tone: 'error', text: t('status.switchRejected') },
        )
        if (ok)
          setDraft((current) => ({ ...current, [kindKey]: { ...current[kindKey], active: id } }))
      }

      /** Renaming the active entry keeps the active pointer on it. */
      const updateProvider = (kindKey, index, next) =>
        setDraft((current) => {
          const previous = current[kindKey].providers[index]
          const active =
            previous && current[kindKey].active === previous.id && next.id
              ? next.id
              : current[kindKey].active
          return {
            ...current,
            [kindKey]: {
              ...current[kindKey],
              active,
              providers: current[kindKey].providers.map((provider, at) =>
                at === index ? next : provider,
              ),
            },
          }
        })

      /** Append a fresh entry and open it, so a new provider is editable at once. */
      const addProvider = (kind) => {
        const index = draft[kind.key].providers.length
        setDraft((current) => {
          const providers = current[kind.key].providers
          const used = new Set(providers.map((provider) => provider.id))
          let serial = providers.length + 1
          while (used.has(`${kind.key}-${serial}`)) serial += 1
          return {
            ...current,
            [kind.key]: {
              ...current[kind.key],
              providers: [...providers, { id: `${kind.key}-${serial}`, vendor: kind.vendorForNew }],
            },
          }
        })
        setOpenRow(`${kind.key}:${index}`)
      }

      /** Removing the active entry clears the pointer, so the profile never names a missing id. */
      const removeProvider = (kindKey, index) =>
        setDraft((current) => {
          const list = current[kindKey].providers
          const removed = list[index]
          const active =
            removed && current[kindKey].active === removed.id ? '' : current[kindKey].active
          return {
            ...current,
            [kindKey]: {
              ...current[kindKey],
              active,
              providers: list.filter((_, at) => at !== index),
            },
          }
        })

      const renderKind = (kind) => {
        const value = draft[kind.key]
        const providers = value.providers
        const effective = effectiveActive(value)
        const status = notice && notice.kind === kind.key ? notice : null
        const named = providers.filter((provider) => provider.id)
        const dirty =
          JSON.stringify(stable(value)) !== JSON.stringify(stable(normalize(saved[kind.key])))
        const editorOpen = openRow.startsWith(`${kind.key}:`)
        const inlineSave = dirty && !editorOpen
        const activeIndex = providers.findIndex(
          (provider) => provider.id !== '' && provider.id === effective,
        )

        return h(
          'section',
          { key: kind.key, style: S.section },
          h(
            'div',
            { style: S.sectionHead },
            h(
              'div',
              { style: S.sectionTitle },
              h('h3', { style: S.h3 }, t(kind.titleKey)),
              h('p', { style: S.hint }, t(kind.hintKey)),
            ),
            h(
              'div',
              { style: S.activeBox },
              h('span', { style: S.activeLabel }, t('label.active')),
              h(Select, {
                pill: true,
                value: effective,
                width: 190,
                ariaLabel: t('a11y.activeFor', { kind: t(kind.titleKey) }),
                disabled: busy === kind.key || named.length === 0,
                options: [
                  {
                    value: '',
                    label:
                      named.length === 0
                        ? t('label.unconfigured')
                        : named.length === 1
                          ? t('label.autoOnly')
                          : t('label.autoUnspecified'),
                  },
                  ...named.map((provider) => ({ value: provider.id, label: provider.id })),
                ],
                onChange: (id) => applyActive(kind.key, id),
              }),
            ),
          ),
          providers.length === 0
            ? h('p', { style: S.empty }, t('label.notConfiguredYet'))
            : h(
                'ul',
                { style: S.list },
                ...providers.map((provider, index) =>
                  h(ProviderCard, {
                    key: `${kind.key}-${index}`,
                    kind,
                    provider,
                    index,
                    providers,
                    isActive: index === activeIndex,
                    open: openRow === `${kind.key}:${index}`,
                    busy: busy === kind.key,
                    onToggle: () => setOpenRow(`${kind.key}:${index}`),
                    onClose: () => setOpenRow(''),
                    onCancel: () => {
                      restore(kind.key)
                      setOpenRow('')
                    },
                    onChange: (next) => updateProvider(kind.key, index, next),
                    onRemove: (at) => {
                      removeProvider(kind.key, at)
                      setOpenRow('')
                    },
                    onSave: () => save(kind.key),
                  }),
                ),
              ),
          h(
            'div',
            { style: { ...S.addRow, justifyContent: 'space-between' } },
            h(
              'button',
              {
                type: 'button',
                className: 'dsh-wp-btn dsh-wp-outline',
                disabled: busy === kind.key,
                onClick: () => addProvider(kind),
              },
              plusIcon(),
              t('action.addProvider'),
            ),
            h(
              'div',
              { style: { display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 } },
              status
                ? h('span', { style: status.tone === 'error' ? S.error : S.status }, status.text)
                : null,
              inlineSave
                ? h(
                    'button',
                    {
                      type: 'button',
                      className: 'dsh-wp-btn dsh-wp-outline',
                      disabled: busy === kind.key,
                      onClick: () => {
                        restore(kind.key)
                        setOpenRow('')
                      },
                    },
                    t('action.revert'),
                  )
                : null,
              inlineSave
                ? h(
                    'button',
                    {
                      type: 'button',
                      className: 'dsh-wp-btn dsh-wp-primary dsh-wp-btn-sm',
                      disabled: busy === kind.key,
                      onClick: () => save(kind.key),
                    },
                    busy === kind.key ? t('action.saving') : t('action.save'),
                  )
                : null,
            ),
          ),
        )
      }

      return h(
        'div',
        { className: 'dsh-wp', style: S.root },
        h('style', null, CSS),
        h(
          'div',
          { style: { display: 'flex', flexDirection: 'column', gap: 12 } },
          h('div', { style: S.titleRow }, h('h2', { style: S.h2 }, t('page.title'))),
          h('p', { style: S.lead }, t('page.lead')),
        ),
        ...KINDS.map(renderKind),
        h('p', { style: S.footerNote }, t('page.footnote')),
      )
    }

    /**
     * Nav glyph. The shell ships an SVG sprite; reusing its globe keeps the row
     * identical to the built-in sections. Older shells without the sprite get a
     * hand-drawn globe of the same weight.
     */
    function WebProvidersIcon({ size }) {
      const box = typeof size === 'number' ? size : 16
      const spriteReady =
        typeof document !== 'undefined' &&
        document.getElementById('dsw-icon-globe-outline-medium') !== null
      if (spriteReady) {
        return h(
          'svg',
          {
            width: box,
            height: box,
            'data-icon': 'dsw-icon-globe-outline-medium',
            'aria-hidden': 'true',
          },
          h('use', { href: '#dsw-icon-globe-outline-medium' }),
        )
      }
      return h(
        'svg',
        { width: box, height: box, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': 'true' },
        h('circle', { cx: 8, cy: 8, r: 6.1, stroke: 'currentColor', strokeWidth: 1.3 }),
        h('ellipse', { cx: 8, cy: 8, rx: 2.6, ry: 6.1, stroke: 'currentColor', strokeWidth: 1.3 }),
        h('path', {
          d: 'M1.9 8h12.2',
          stroke: 'currentColor',
          strokeWidth: 1.3,
          strokeLinecap: 'round',
        }),
      )
    }

    function apply(ctx) {
      ctx.locale.register(NS, { en: MESSAGES.en, zh: MESSAGES.zh })
      t = ctx.locale.bind(NS)

      ctx.effect(
        () =>
          ctx.configForms.whileServed([NS], () =>
            ctx.slots.inject('settings.section', () =>
              ctx.slots.register(
                {
                  name: 'settings.section',
                  id: 'web-providers',
                  order: 60,
                  label: () => t('page.title'),
                  inject: () => ({ form: ctx.configForms.get(NS) }),
                },
                WebProvidersSection,
              ),
            ),
          ),
        'web-providers: settings section',
      )
      ctx.effect(
        () =>
          ctx.slots.inject('settings.section.icon', () =>
            ctx.slots.register(
              {
                name: 'settings.section.icon',
                id: 'web-providers',
                order: 60,
                label: t('page.title'),
              },
              WebProvidersIcon,
            ),
          ),
        'web-providers: settings icon',
      )
    }

    exports.apply = apply
    exports.inject = inject
    exports.WebProvidersSection = WebProvidersSection
    return module.exports
  },
})
