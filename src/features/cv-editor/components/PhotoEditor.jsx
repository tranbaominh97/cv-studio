import React, { useEffect, useRef, useState } from 'react';

export default function PhotoEditor({ photo, templateId, disabled, onChange }) {
  const round = ['ivory', 'timeline', 'studio'].includes(templateId);
  const cropHeight = round ? 480 : templateId === 'slate' ? Math.round(480 * 35 / 31) : 600;
  const [crop, setCrop] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const canvas = useRef(null);
  const dialog = useRef(null);
  const input = useRef(null);
  const generation = useRef(0);
  useEffect(() => () => { generation.current++; }, []);
  useEffect(() => {
    if (!crop || !canvas.current) return;
    if (!dialog.current.open) dialog.current.showModal();
    const { image, x, y, zoom } = crop;
    const context = canvas.current.getContext('2d');
    const scale = Math.max(480 / image.width, cropHeight / image.height) * zoom;
    const width = image.width * scale;
    const height = image.height * scale;
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, 480, cropHeight);
    context.drawImage(image, -(width - 480) * x / 100, -(height - cropHeight) * y / 100, width, height);
  }, [crop, cropHeight]);
  async function choose(file) {
    if (!file) return;
    const version = ++generation.current;
    setError('');
    setLoading(true);
    let url;
    try {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10_000_000) throw new Error('Chọn ảnh JPG, PNG hoặc WebP tối đa 10 MB.');
      url = URL.createObjectURL(file);
      const image = new Image();
      image.src = url;
      await image.decode();
      if (image.width * image.height > 24_000_000) throw new Error('Ảnh quá lớn. Hãy chọn ảnh dưới 24 megapixel.');
      if (generation.current === version) setCrop({ image, x: 50, y: 50, zoom: 1 });
    } catch (error) {
      if (generation.current === version) setError(error.message.startsWith('Chọn') || error.message.startsWith('Ảnh') ? error.message : 'Không đọc được ảnh. Hãy chọn file khác.');
    } finally {
      if (url) URL.revokeObjectURL(url);
      if (generation.current === version) setLoading(false);
    }
  }
  return <div className="photo-control">
    <input className="sr-only" tabIndex={-1} ref={input} type="file" accept="image/jpeg,image/png,image/webp" aria-label="Chọn ảnh chân dung" disabled={disabled || loading} onChange={event => { choose(event.target.files[0]); event.target.value = ''; }} />
    <div className="photo-actions">{photo && <img src={photo} alt="Ảnh chân dung đang dùng" />}<button disabled={disabled || loading} onClick={() => input.current.click()}>{loading ? 'Đang đọc ảnh…' : photo ? 'Đổi ảnh' : '+ Thêm ảnh'}</button>{photo && <button disabled={disabled || loading} onClick={() => onChange(null)}>Xóa ảnh</button>}</div>
    {error && <p className="dialog-error" role="alert">{error}</p>}
    {crop && <dialog ref={dialog} className="modal photo-modal" aria-labelledby="photo-title" onCancel={event => { event.preventDefault(); setCrop(null); }}>
      <h2 id="photo-title">Căn ảnh chân dung</h2><p>Khung ảnh theo mẫu đang chọn.</p><canvas ref={canvas} width={480} height={cropHeight} style={{ width: 180, height: 180 * cropHeight / 480, borderRadius: round ? '50%' : templateId === 'slate' ? 4 : templateId === 'executive' || templateId === 'metro' ? 0 : 12 }} aria-label="Xem trước khung ảnh chân dung" />
      {[['zoom', 'Phóng to', 1, 3, 0.05], ['x', 'Vị trí ngang', 0, 100, 1], ['y', 'Vị trí dọc', 0, 100, 1]].map(([key, label, min, max, step], index) => <label className="slider-control" key={key}><span>{label}</span><input autoFocus={index === 0} type="range" min={min} max={max} step={step} value={crop[key]} onChange={event => setCrop({ ...crop, [key]: Number(event.target.value) })} /></label>)}
      <div className="modal-actions"><button onClick={() => setCrop(null)}>Hủy</button><button className="primary" onClick={() => { onChange(canvas.current.toDataURL('image/jpeg', 0.9)); setCrop(null); }}>Dùng ảnh này</button></div>
    </dialog>}
  </div>;
}
