import { useMemo, useState } from 'react';
import './theme-editor.css';

type Breakpoint = 'desktop' | 'tablet' | 'mobile';
type TemplateName = 'home' | 'page' | 'post';

interface Spacing {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

interface ResponsiveSettings {
  hidden?: boolean;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  margin?: Partial<Spacing>;
  padding?: Partial<Spacing>;
  order?: number;
}

interface EditableBlock {
  id: string;
  template: TemplateName;
  regionId: string;
  type: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  order: number;
  margin: Spacing;
  padding: Spacing;
  settings?: Record<string, unknown>;
  responsive?: Partial<Record<Breakpoint, ResponsiveSettings>>;
}

interface ThemeRegion {
  id: string;
  template: TemplateName;
  name: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  order: number;
  editable: boolean;
  blocks: EditableBlock[];
  responsive?: Partial<Record<Breakpoint, ResponsiveSettings>>;
}

interface ThemeLayout {
  themeId: string;
  template: TemplateName;
  canvas: {
    width: number;
    height: number;
    breakpoint: Breakpoint;
  };
  regions: ThemeRegion[];
  previewToken?: string;
}

const emptySpacing: Spacing = { top: 0, right: 0, bottom: 0, left: 0 };

const initialLayout: ThemeLayout = {
  themeId: 'default',
  template: 'home',
  canvas: { width: 1200, height: 900, breakpoint: 'desktop' },
  regions: [
    {
      id: 'home-hero',
      template: 'home',
      name: 'hero',
      label: 'Hero',
      x: 40,
      y: 40,
      width: 1120,
      height: 360,
      order: 0,
      editable: true,
      blocks: [
        {
          id: 'hero-title',
          template: 'home',
          regionId: 'home-hero',
          type: 'text',
          label: 'Hero title',
          x: 80,
          y: 96,
          width: 480,
          height: 120,
          order: 0,
          margin: { ...emptySpacing, bottom: 24 },
          padding: { top: 16, right: 16, bottom: 16, left: 16 },
        },
      ],
    },
  ],
};

async function saveThemeLayout(layout: ThemeLayout, preview: boolean): Promise<ThemeLayout> {
  const response = await fetch(`/api/themes/active/layout?template=${layout.template}&preview=${String(preview)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(layout),
  });

  if (!response.ok) {
    throw new Error(`Failed to save theme layout: ${response.status}`);
  }

  return response.json();
}

export function ThemeEditor(): JSX.Element {
  const [layout, setLayout] = useState<ThemeLayout>(initialLayout);
  const [selectedBlockId, setSelectedBlockId] = useState(layout.regions[0]?.blocks[0]?.id ?? '');
  const [draggingId, setDraggingId] = useState<string>();
  const [previewMode, setPreviewMode] = useState(false);
  const [status, setStatus] = useState('Draft layout is local.');

  const blocks = useMemo(() => layout.regions.flatMap((region) => region.blocks), [layout.regions]);
  const selectedBlock = blocks.find((block) => block.id === selectedBlockId);

  function updateBlock(blockId: string, patch: Partial<EditableBlock>): void {
    setLayout((current) => ({
      ...current,
      regions: current.regions.map((region) => ({
        ...region,
        blocks: region.blocks.map((block) => (block.id === blockId ? { ...block, ...patch } : block)),
      })),
    }));
  }

  function addBlock(type: string): void {
    const region = layout.regions[0];
    if (!region) return;

    const block: EditableBlock = {
      id: `${type}-${Date.now()}`,
      template: layout.template,
      regionId: region.id,
      type,
      label: `${type} block`,
      x: region.x + 48,
      y: region.y + 48,
      width: 260,
      height: 120,
      order: region.blocks.length,
      margin: emptySpacing,
      padding: { top: 12, right: 12, bottom: 12, left: 12 },
    };

    setLayout((current) => ({
      ...current,
      regions: current.regions.map((candidate) =>
        candidate.id === region.id ? { ...candidate, blocks: [...candidate.blocks, block] } : candidate,
      ),
    }));
    setSelectedBlockId(block.id);
  }

  async function persist(preview: boolean): Promise<void> {
    setStatus(preview ? 'Saving preview layout…' : 'Publishing active layout…');
    try {
      const saved = await saveThemeLayout(layout, preview);
      setLayout(saved);
      setPreviewMode(preview);
      setStatus(preview ? 'Preview is ready.' : 'Layout has been published.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Unknown save error.');
    }
  }

  return (
    <main className="theme-editor">
      <header className="theme-editor__toolbar">
        <div>
          <p className="theme-editor__eyebrow">Visual theme editor</p>
          <h1>Theme layout canvas</h1>
        </div>
        <label>
          Template
          <select
            value={layout.template}
            onChange={(event) => setLayout((current) => ({ ...current, template: event.target.value as TemplateName }))}
          >
            <option value="home">Home</option>
            <option value="page">Page</option>
            <option value="post">Post</option>
          </select>
        </label>
        <label>
          Breakpoint
          <select
            value={layout.canvas.breakpoint}
            onChange={(event) =>
              setLayout((current) => ({
                ...current,
                canvas: { ...current.canvas, breakpoint: event.target.value as Breakpoint },
              }))
            }
          >
            <option value="desktop">Desktop</option>
            <option value="tablet">Tablet</option>
            <option value="mobile">Mobile</option>
          </select>
        </label>
        <button type="button" onClick={() => setPreviewMode((value) => !value)}>
          {previewMode ? 'Edit mode' : 'Preview mode'}
        </button>
        <button type="button" onClick={() => persist(true)}>Save preview</button>
        <button type="button" className="theme-editor__primary" onClick={() => persist(false)}>Publish layout</button>
      </header>

      <section className="theme-editor__workspace">
        <aside className="theme-editor__palette" aria-label="Block palette">
          <h2>Blocks</h2>
          {['text', 'image', 'gallery', 'form', 'content'].map((type) => (
            <button key={type} type="button" draggable onDragStart={() => setDraggingId(type)} onClick={() => addBlock(type)}>
              + {type}
            </button>
          ))}
          <p>{status}</p>
        </aside>

        <div
          className={`theme-editor__canvas theme-editor__canvas--${layout.canvas.breakpoint}`}
          style={{ width: layout.canvas.width, height: layout.canvas.height }}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            if (draggingId) addBlock(draggingId);
            setDraggingId(undefined);
          }}
        >
          {layout.regions.map((region) => (
            <section
              key={region.id}
              className="theme-editor__region"
              style={{ left: region.x, top: region.y, width: region.width, height: region.height }}
            >
              <span>{region.label}</span>
              {region.blocks.map((block) => (
                <button
                  key={block.id}
                  type="button"
                  className={`theme-editor__block ${selectedBlockId === block.id ? 'is-selected' : ''}`}
                  style={{ left: block.x - region.x, top: block.y - region.y, width: block.width, height: block.height }}
                  onClick={() => setSelectedBlockId(block.id)}
                  draggable={!previewMode}
                  onDragStart={() => setDraggingId(block.id)}
                  onDragEnd={(event) => {
                    if (previewMode) return;
                    updateBlock(block.id, {
                      x: Math.max(region.x, region.x + event.currentTarget.offsetLeft),
                      y: Math.max(region.y, region.y + event.currentTarget.offsetTop),
                    });
                  }}
                >
                  {block.label}
                  {!previewMode && <i className="theme-editor__resize" aria-hidden="true" />}
                </button>
              ))}
            </section>
          ))}
        </div>

        <aside className="theme-editor__inspector" aria-label="Block settings">
          <h2>Settings</h2>
          {selectedBlock ? (
            <>
              <label>
                Label
                <input value={selectedBlock.label} onChange={(event) => updateBlock(selectedBlock.id, { label: event.target.value })} />
              </label>
              {(['x', 'y', 'width', 'height', 'order'] as const).map((field) => (
                <label key={field}>
                  {field}
                  <input
                    type="number"
                    value={selectedBlock[field]}
                    onChange={(event) => updateBlock(selectedBlock.id, { [field]: Number(event.target.value) })}
                  />
                </label>
              ))}
              <fieldset>
                <legend>Padding</legend>
                {(['top', 'right', 'bottom', 'left'] as const).map((side) => (
                  <label key={side}>
                    {side}
                    <input
                      type="number"
                      value={selectedBlock.padding[side]}
                      onChange={(event) =>
                        updateBlock(selectedBlock.id, {
                          padding: { ...selectedBlock.padding, [side]: Number(event.target.value) },
                        })
                      }
                    />
                  </label>
                ))}
              </fieldset>
              <fieldset>
                <legend>Margin</legend>
                {(['top', 'right', 'bottom', 'left'] as const).map((side) => (
                  <label key={side}>
                    {side}
                    <input
                      type="number"
                      value={selectedBlock.margin[side]}
                      onChange={(event) =>
                        updateBlock(selectedBlock.id, {
                          margin: { ...selectedBlock.margin, [side]: Number(event.target.value) },
                        })
                      }
                    />
                  </label>
                ))}
              </fieldset>
            </>
          ) : (
            <p>Select a block on the canvas to edit coordinates, size, spacing, and order.</p>
          )}
        </aside>
      </section>
    </main>
  );
}
