/** Copy dictionaries for the image-input card. */

/** English strings (the key-set source of truth for this pair). */
export const en = {
  title: 'Input modalities',
  loading: 'Loading the model list…',
  loadFailed: 'Loading the model configuration failed.',
  retry: 'Retry',
  empty: 'No explicit model list yet — add models in the catalog above, then declare their input modalities here.',
  inheritsHint: 'Showing the inherited model list; saving copies it into your user settings.',
  readOnly: 'The settings document is read-only in this deployment.',
  choiceDefault: 'Provider default',
  choiceText: 'Text only',
  choiceImage: 'Text and image',
  save: 'Save',
  saving: 'Saving…',
  saved: 'Saved. The adapter picks it up on its next request.',
  conflict: 'These settings changed elsewhere while this card was open; the latest values were reloaded.',
}

/** The settings.models.imageInput namespace key union. */
export type ImageInputKey = keyof typeof en

/** Chinese strings (same keys as {@link en}). */
export const zh: { [Key in keyof typeof en]: string } = {
  title: '输入模态',
  loading: '正在读取模型列表…',
  loadFailed: '读取模型配置失败。',
  retry: '重试',
  empty: '还没有显式模型列表——请先在上方模型目录中添加模型，再回到这里声明输入模态。',
  inheritsHint: '当前显示的是继承的模型列表；保存会将其复制到你的用户设置层。',
  readOnly: '当前部署的设置文档为只读。',
  choiceDefault: '提供方默认',
  choiceText: '仅文本',
  choiceImage: '文本和图片',
  save: '保存',
  saving: '保存中…',
  saved: '已保存。适配器会在下一次请求时生效。',
  conflict: '这张卡片打开期间，设置已被其他地方改动；已重新加载最新值。',
}
