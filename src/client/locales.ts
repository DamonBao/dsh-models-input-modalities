/** Copy dictionaries for the model-capability card. */

/** English strings (the key-set source of truth for this pair). */
export const en = {
  title: 'Model capabilities',
  loading: 'Loading the model list…',
  loadFailed: 'Loading the model configuration failed.',
  retry: 'Retry',
  empty: 'No explicit model list yet — add models in the catalog above, then declare what each one accepts and reasons with here.',
  inheritsHint: 'Showing the inherited model list; saving copies it into your user settings.',
  readOnly: 'The settings document is read-only in this deployment.',
  inputLabel: 'Input modalities',
  choiceDefault: 'Provider default',
  choiceText: 'Text only',
  choiceImage: 'Text and image',
  reasoningLabel: 'Reasoning levels',
  reasoningInherit: 'Catalog default',
  reasoningNone: 'Not a reasoning model',
  reasoningCustom: 'Declare levels',
  reasoningHint: 'A ticked level is one the model picker offers; the value beside it is the spelling sent on the wire, which a gateway may name its own way. Only off may stay empty — offered, and sent as no parameter at all. A level left unticked is not offered.',
  wireLabel: 'Wire value for',
  wireNothing: 'send nothing',
  needsLevel: 'declare at least one level beyond off, or choose “Not a reasoning model”.',
  needsWire: 'every level except off needs the wire value to send.',
  save: 'Save',
  saving: 'Saving…',
  saved: 'Saved. The adapter picks it up on its next request.',
  conflict: 'These settings changed elsewhere while this card was open; the latest values were reloaded.',
}

/** The settings.models.modelCapabilities namespace key union. */
export type ModelCapabilityKey = keyof typeof en

/** Chinese strings (same keys as {@link en}). */
export const zh: { [Key in keyof typeof en]: string } = {
  title: '模型能力',
  loading: '正在读取模型列表…',
  loadFailed: '读取模型配置失败。',
  retry: '重试',
  empty: '还没有显式模型列表——请先在上方模型目录中添加模型，再回到这里声明每个模型接受的输入与推理等级。',
  inheritsHint: '当前显示的是继承的模型列表；保存会将其复制到你的用户设置层。',
  readOnly: '当前部署的设置文档为只读。',
  inputLabel: '输入模态',
  choiceDefault: '提供方默认',
  choiceText: '仅文本',
  choiceImage: '文本和图片',
  reasoningLabel: '推理等级',
  reasoningInherit: '目录默认',
  reasoningNone: '非推理模型',
  reasoningCustom: '声明等级',
  reasoningHint: '勾选的等级就是模型选择器会提供的选项；旁边的值是实际发到网关的拼写，网关可以有自己的叫法。只有 off 可以留空——表示提供该等级但完全不发送参数。未勾选的等级不会提供。',
  wireLabel: '发送值：',
  wireNothing: '不发送',
  needsLevel: '至少声明一个 off 以外的等级，或选择「非推理模型」。',
  needsWire: '除 off 外，每个勾选的等级都要填写发送值。',
  save: '保存',
  saving: '保存中…',
  saved: '已保存。适配器会在下一次请求时生效。',
  conflict: '这张卡片打开期间，设置已被其他地方改动；已重新加载最新值。',
}
