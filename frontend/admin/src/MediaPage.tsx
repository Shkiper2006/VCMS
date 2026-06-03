import { FormEvent, useEffect, useState } from 'react';
import { type MediaAsset, fetchJson, formatBytes, formatDate } from './admin-api';
import { useAuth } from './auth';

const emptyForm = {
  filename: '',
  url: '',
  mimeType: 'image/jpeg',
  sizeBytes: '0',
  alt: '',
};

export function MediaPage(): JSX.Element {
  const { token, user } = useAuth();
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();

  async function loadMedia(): Promise<void> {
    setIsLoading(true);
    setError(undefined);
    try {
      setAssets(await fetchJson<MediaAsset[]>('/api/media', token));
    } catch {
      setError('Не удалось загрузить медиатеку из /api/media.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadMedia();
  }, [token]);

  async function uploadMedia(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setMessage('Загружаем медиафайл…');
    setError(undefined);
    try {
      const asset = await fetchJson<MediaAsset>('/api/media', token, {
        method: 'POST',
        body: JSON.stringify({
          filename: form.filename,
          url: form.url,
          mimeType: form.mimeType,
          sizeBytes: Number(form.sizeBytes) || 0,
          alt: form.alt || undefined,
          createdBy: user?.id,
        }),
      });
      setAssets((current) => [asset, ...current]);
      setForm(emptyForm);
      setMessage('Файл добавлен в медиатеку.');
    } catch {
      setMessage(undefined);
      setError('POST /api/media не вернул успешный ответ. Проверьте поля и права пользователя.');
    }
  }

  return (
    <section className="wp-panel">
      <div className="wp-panel__header">
        <div>
          <p className="dashboard__eyebrow">/api/media</p>
          <h2>Медиатека</h2>
          <p>WordPress-like библиотека файлов: список ассетов и форма добавления через REST endpoint.</p>
        </div>
      </div>

      {message ? <div className="notice notice--success">{message}</div> : null}
      {error ? <div className="notice notice--error">{error}</div> : null}

      <form className="media-upload" onSubmit={uploadMedia}>
        <label>Имя файла<input required value={form.filename} onChange={(event) => setForm({ ...form, filename: event.target.value })} placeholder="hero.jpg" /></label>
        <label>URL<input required value={form.url} onChange={(event) => setForm({ ...form, url: event.target.value })} placeholder="/uploads/hero.jpg" /></label>
        <label>MIME<input required value={form.mimeType} onChange={(event) => setForm({ ...form, mimeType: event.target.value })} /></label>
        <label>Размер, байт<input type="number" min="0" value={form.sizeBytes} onChange={(event) => setForm({ ...form, sizeBytes: event.target.value })} /></label>
        <label>Alt<input value={form.alt} onChange={(event) => setForm({ ...form, alt: event.target.value })} /></label>
        <button className="button-primary" type="submit">Добавить файл</button>
      </form>

      {isLoading ? <div className="notice">Загружаем медиатеку…</div> : null}

      <div className="media-grid">
        {assets.map((asset) => (
          <article key={asset.id} className="media-card">
            {asset.mimeType.startsWith('image/') ? <img src={asset.url} alt={asset.alt || asset.filename} /> : <div className="media-card__file">{asset.mimeType}</div>}
            <div>
              <strong>{asset.filename}</strong>
              <span>{formatBytes(asset.sizeBytes)} · {formatDate(asset.createdAt)}</span>
              <code>{asset.url}</code>
            </div>
          </article>
        ))}
        {!isLoading && assets.length === 0 ? <div className="notice">В медиатеке пока нет файлов.</div> : null}
      </div>
    </section>
  );
}
