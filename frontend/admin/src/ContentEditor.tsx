import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import './content-editor.css';

type ContentStatus = 'draft' | 'scheduled' | 'published' | 'archived';
type BlockType = 'text' | 'image' | 'gallery' | 'form' | 'video' | `plugin:${string}`;

interface ContentBlock {
  id: string;
  type: BlockType;
  label?: string;
  data: Record<string, unknown>;
}

interface ContentItem {
  id: string;
  type: string;
  title: string;
  slug: string;
  excerpt?: string;
  body: string;
  status: ContentStatus;
  blocks: ContentBlock[];
}

interface BlockDefinition {
  type: BlockType;
  title: string;
  description: string;
  defaultData: Record<string, unknown>;
}

const blockPalette: BlockDefinition[] = [
  { type: 'text', title: 'Текст', description: 'Markdown или короткий rich-text блок.', defaultData: { text: '', format: 'markdown' } },
  { type: 'image', title: 'Изображение', description: 'Загрузка или выбор изображения из медиатеки.', defaultData: { mediaId: '', url: '', alt: '', caption: '' } },
  { type: 'gallery', title: 'Галерея', description: 'Набор изображений в сетке.', defaultData: { mediaIds: [], layout: 'grid' } },
  { type: 'video', title: 'Видео', description: 'Вставка внешнего видео по URL.', defaultData: { url: '', provider: 'external', caption: '' } },
  { type: 'form', title: 'Форма', description: 'Простая форма с действием отправки.', defaultData: { fields: [], submitLabel: 'Submit', action: 'email' } },
];

function createInitialDraft(type = 'page', id = 'draft-local'): ContentItem {
  const normalizedType = type === 'post' ? 'post' : 'page';
  const title = normalizedType === 'post' ? 'Новая запись' : 'Новая страница';

  return {
    id,
    type: normalizedType,
    title,
    slug: normalizedType === 'post' ? 'new-post' : 'new-page',
    body: '',
    status: 'draft',
    blocks: [],
  };
}

export function ContentEditor(): JSX.Element {
  const { type, id } = useParams();
  const initialDraft = useMemo(() => createInitialDraft(type, id ?? 'draft-local'), [id, type]);
  const [item, setItem] = useState<ContentItem>(initialDraft);

  useEffect(() => {
    setItem(initialDraft);
  }, [initialDraft]);
  const [selectedBlockId, setSelectedBlockId] = useState<string>();
  const [status, setStatus] = useState('Черновик готов к редактированию.');
  const selectedBlock = item.blocks.find((block) => block.id === selectedBlockId);
  const previewUrl = useMemo(() => `/editor/preview/${item.type}/${item.id}`, [item.id, item.type]);

  function addBlock(definition: BlockDefinition): void {
    const block: ContentBlock = {
      id: `${definition.type}-${Date.now()}`,
      type: definition.type,
      label: definition.title,
      data: { ...definition.defaultData },
    };
    setItem((current) => ({ ...current, status: 'draft', blocks: [...current.blocks, block] }));
    setSelectedBlockId(block.id);
  }

  function updateBlock(blockId: string, data: Record<string, unknown>): void {
    setItem((current) => ({
      ...current,
      status: 'draft',
      blocks: current.blocks.map((block) =>
        block.id === blockId ? { ...block, data: { ...block.data, ...data } } : block,
      ),
    }));
  }

  function removeBlock(blockId: string): void {
    setItem((current) => ({ ...current, status: 'draft', blocks: current.blocks.filter((block) => block.id !== blockId) }));
    setSelectedBlockId(undefined);
  }

  function moveBlock(blockId: string, direction: -1 | 1): void {
    setItem((current) => {
      const index = current.blocks.findIndex((block) => block.id === blockId);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.blocks.length) return current;
      const blocks = [...current.blocks];
      const [block] = blocks.splice(index, 1);
      blocks.splice(nextIndex, 0, block);
      return { ...current, status: 'draft', blocks };
    });
  }

  async function saveDraft(): Promise<void> {
    setStatus('Сохраняем черновик…');
    await sendEditorMutation(`/api/content/${item.type}/${item.id}`, 'PATCH', item);
    setStatus('Черновик сохранён. Изменения ещё не опубликованы на сайте.');
  }

  async function publish(): Promise<void> {
    setStatus('Публикуем материал…');
    await sendEditorMutation(`/api/content/${item.type}/${item.id}/publish`, 'POST', {});
    setItem((current) => ({ ...current, status: 'published' }));
    setStatus('Материал опубликован.');
  }

  return (
    <main className="content-editor">
      <header className="content-editor__toolbar">
        <div>
          <p className="content-editor__eyebrow">Block content editor</p>
          <h1>{item.title}</h1>
          <span className="content-editor__status">{status}</span>
        </div>
        <input value={item.title} onChange={(event) => setItem({ ...item, title: event.target.value, status: 'draft' })} />
        <input value={item.slug} onChange={(event) => setItem({ ...item, slug: event.target.value, status: 'draft' })} />
        <a href={previewUrl} target="_blank" rel="noreferrer">Предпросмотр</a>
        <button type="button" onClick={saveDraft}>Сохранить черновик</button>
        <button type="button" className="content-editor__primary" onClick={publish}>Опубликовать</button>
      </header>

      <section className="content-editor__workspace">
        <aside className="content-editor__panel">
          <h2>Панель блоков</h2>
          <button type="button" className="content-editor__add">Добавить</button>
          {blockPalette.map((definition) => (
            <button key={definition.type} type="button" onClick={() => addBlock(definition)}>
              <strong>{definition.title}</strong>
              <span>{definition.description}</span>
            </button>
          ))}
        </aside>

        <article className="content-editor__theme-preview" aria-label="Active theme preview">
          <header className="content-editor__theme-header">Активная тема / {item.type}</header>
          <h1 contentEditable suppressContentEditableWarning onBlur={(event) => setItem({ ...item, title: event.currentTarget.textContent ?? item.title, status: 'draft' })}>
            {item.title}
          </h1>
          {item.excerpt && <p>{item.excerpt}</p>}
          {item.blocks.map((block, index) => (
            <section key={block.id} className="content-editor__block" data-selected={block.id === selectedBlockId} onClick={() => setSelectedBlockId(block.id)}>
              <div className="content-editor__block-actions">
                <button type="button" onClick={() => moveBlock(block.id, -1)}>↑</button>
                <button type="button" onClick={() => moveBlock(block.id, 1)}>↓</button>
                <button type="button" onClick={() => removeBlock(block.id)}>Удалить</button>
              </div>
              <BlockPreview block={block} index={index} onChange={(data) => updateBlock(block.id, data)} />
            </section>
          ))}
        </article>

        <aside className="content-editor__panel">
          <h2>Свойства</h2>
          {selectedBlock ? <BlockInspector block={selectedBlock} onChange={(data) => updateBlock(selectedBlock.id, data)} /> : <p>Выберите блок для inline-редактирования.</p>}
        </aside>
      </section>
    </main>
  );
}

function BlockPreview({ block, index, onChange }: { block: ContentBlock; index: number; onChange: (data: Record<string, unknown>) => void }): JSX.Element {
  if (block.type === 'text') {
    return (
      <div
        className="content-editor__text"
        contentEditable
        suppressContentEditableWarning
        onBlur={(event) => onChange({ text: event.currentTarget.textContent ?? '' })}
      >
        {String(block.data.text || `Текстовый блок #${index + 1}`)}
      </div>
    );
  }

  if (block.type === 'image') {
    const url = String(block.data.url || '');
    return url ? <img src={url} alt={String(block.data.alt || '')} /> : <div className="content-editor__placeholder">Выберите или загрузите изображение</div>;
  }

  if (block.type === 'video') {
    return <div className="content-editor__placeholder">Видео: {String(block.data.url || 'вставьте URL')}</div>;
  }

  return <div className="content-editor__placeholder">{block.label ?? block.type}</div>;
}

function BlockInspector({ block, onChange }: { block: ContentBlock; onChange: (data: Record<string, unknown>) => void }): JSX.Element {
  if (block.type === 'image') {
    return (
      <>
        <label>URL изображения<input value={String(block.data.url || '')} onChange={(event) => onChange({ url: event.target.value })} /></label>
        <label>Alt<input value={String(block.data.alt || '')} onChange={(event) => onChange({ alt: event.target.value })} /></label>
        <label>Caption<input value={String(block.data.caption || '')} onChange={(event) => onChange({ caption: event.target.value })} /></label>
        <button type="button">Загрузить / выбрать из медиатеки</button>
      </>
    );
  }

  if (block.type === 'video') {
    return (
      <>
        <label>Video URL<input value={String(block.data.url || '')} onChange={(event) => onChange({ url: event.target.value, provider: 'external' })} /></label>
        <label>Caption<input value={String(block.data.caption || '')} onChange={(event) => onChange({ caption: event.target.value })} /></label>
      </>
    );
  }

  return <textarea value={JSON.stringify(block.data, null, 2)} onChange={(event) => onChange(JSON.parse(event.target.value || '{}'))} />;
}

async function sendEditorMutation(path: string, method: 'PATCH' | 'POST', body: unknown): Promise<void> {
  if (path.includes('draft-local')) {
    await Promise.resolve();
    return;
  }

  await fetch(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
