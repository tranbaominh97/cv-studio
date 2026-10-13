import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { FileText, FolderOpen, Copy, RefreshCw, Undo2, Download, Printer, Eye, Pencil, Check, AlertCircle, Save } from 'lucide-react';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import workerURL from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { useCVState } from './features/cv-editor/hooks/useCVState';
import CVEditor from './features/cv-editor/components/CVEditor';

GlobalWorkerOptions.workerSrc = workerURL;

function PDFPreview({ pdf, onError }) {
  const container = useRef(null);
  useEffect(() => {
    let cancelled = false;
    const tasks = [];
    const host = container.current;
    host.replaceChildren();
    (async () => {
      for (let i = 1; i <= pdf.document.numPages; i++) {
        const page = await pdf.document.getPage(i);
        if (cancelled) return;
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        canvas.setAttribute('aria-label', `Bản in PDF trang ${i}`);
        host.appendChild(canvas);
        const task = page.render({ canvasContext: canvas.getContext('2d'), viewport });
        tasks.push(task);
        await task.promise;
      }
    })().catch(error => { if (!cancelled) onError(error); });
    return () => { cancelled = true; tasks.forEach(task => task.cancel()); };
  }, [pdf]);
  return <div className="pdf-pages" ref={container} />;
}

export default function App() {
  const cv = useCVState();
  const isLetter = cv.kind === 'cover-letter';
  const documentLabel = isLetter ? 'Cover Letter' : 'CV';
  const sheet = useRef(null);
  const [usedHeight, setUsedHeight] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [busy, setBusy] = useState(false);
  const [pdf, setPDF] = useState(null);
  const pdfRef = useRef(null);
  const [mode, setMode] = useState('edit');
  const [notice, setNotice] = useState('');
  const [modal, setModal] = useState(null);
  const [newName, setNewName] = useState('');
  const availableHeight = (297 - cv.layout.margin * 2) * 96 / 25.4;
  const estimatedOverflow = usedHeight > availableHeight + 0.5;
  // Screen layout is only an estimate. A generated PDF is authoritative until edited.
  const pdfPages = pdf?.document.numPages;
  const overflow = pdfPages == null ? estimatedOverflow : pdfPages > 1;
  const overflowMM = Math.max(0, (usedHeight - availableHeight) * 25.4 / 96);

  useLayoutEffect(() => {
    if (!sheet.current) return;
    const content = sheet.current.querySelector('.cv-content');
    const update = () => setUsedHeight(content.offsetHeight);
    const observer = new ResizeObserver(update);
    observer.observe(content);
    update();
    return () => observer.disconnect();
  }, [cv.kind, cv.filename, cv.loading, mode]);

  function invalidate() {
    if (pdfRef.current) { pdfRef.current.loadingTask.destroy().catch(() => {}); pdfRef.current = null; }
    setPDF(null);
    setMode('edit');
    setNotice('');
  }
  function edit(data, layout, undo) { invalidate(); cv.edit(data, layout, undo); }
  async function run(action) {
    if (busy) return;
    setBusy(true);
    try { await action(); }
    catch (error) { cv.fail(error); }
    finally { setBusy(false); }
  }
  async function buildPDF() {
    await cv.flush();
    if (pdfRef.current) return pdfRef.current;
    document.activeElement?.blur();
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const bytes = await window.desktop.pdf();
    const loadingTask = getDocument({ data: bytes.slice(), isEvalSupported: false });
    const pdfDocument = await loadingTask.promise;
    const next = { bytes, document: pdfDocument, loadingTask };
    pdfRef.current = next;
    setPDF(next);
    return next;
  }
  async function preview() { await buildPDF(); setMode('pdf'); }
  async function savePDF() {
    const result = await buildPDF();
    if (result.document.numPages > 1) { setMode('pdf'); setNotice('PDF có nhiều hơn 1 trang. Quay lại sửa để vừa một trang trước khi lưu.'); return; }
    const destination = await window.desktop.savePDF(cv.filename, result.bytes);
    if (destination) setNotice(`Đã lưu PDF: ${destination}`);
  }
  async function print() {
    const result = await buildPDF();
    if (result.document.numPages > 1) { setMode('pdf'); setNotice('PDF có nhiều hơn 1 trang. Quay lại sửa trước khi in.'); return; }
    const printed = await window.desktop.print();
    if (printed) setNotice('Đã gửi bản in tới máy in bạn chọn.');
  }
  function askDuplicate() { setNewName((cv.filename.replace(/\.md$/, '') + (cv.filename ? ' - Bản sao' : `${documentLabel} mới`)).slice(0, 175)); setModal('duplicate'); }
  function askLetter() { setNewName((cv.sourceName.replace(/\.md$/, '').slice(0, 155) + ' - Cover Letter').replace(/^ - /, '')); setModal('create-letter'); }
  async function reload() { invalidate(); await cv.reload(); setModal(null); }
  const actions = useRef({});
  actions.current = { save: () => run(() => cv.flush()), print: () => run(print), undo: () => { invalidate(); cv.undo(); } };
  useEffect(() => {
    function keyboard(event) {
      if (!(event.ctrlKey || event.metaKey)) return;
      if (event.key.toLowerCase() === 's') { event.preventDefault(); actions.current.save(); }
      if (event.key.toLowerCase() === 'p') { event.preventDefault(); actions.current.print(); }
      if (event.key.toLowerCase() === 'z' && document.activeElement?.tagName !== 'TEXTAREA') { event.preventDefault(); actions.current.undo(); }
    }
    window.addEventListener('keydown', keyboard);
    return () => window.removeEventListener('keydown', keyboard);
  }, []);

  return <div className={`studio ${busy ? 'is-busy' : ''}`}>
    <style>{`@page { size: A4; margin: ${cv.layout.margin}mm; background: white; }`}</style>
    <header className="toolbar no-print">
      <div className="brand"><img className="brand-mark" src="./app-icon.png" alt="" /><div><b>CV Studio</b><small>Sửa gọn. In vừa một trang.</small></div></div>
      <div className="save-status" role="status">{cv.dirty ? <><span className="status-dot pending" />{cv.error ? 'Chưa lưu được' : 'Đang lưu...'}</> : <><Check size={15} />Đã lưu</>}</div>
      <div className="toolbar-actions">
        <button disabled={!cv.data || busy || cv.loading} className={mode === 'pdf' ? 'active' : ''} onClick={() => mode === 'pdf' ? setMode('edit') : run(preview)}>{mode === 'pdf' ? <Pencil size={17} /> : <Eye size={17} />}{mode === 'pdf' ? 'Quay lại sửa' : 'Xem bản in'}</button>
        <button disabled={!cv.data || busy || cv.loading} onClick={() => run(print)}><Printer size={17} />In</button>
        <button className="primary" disabled={!cv.data || busy || cv.loading} onClick={() => run(savePDF)}><Download size={17} />Lưu PDF</button>
      </div>
    </header>
    <div className="studio-body">
      <aside className="sidebar no-print">
        <div className="document-tabs" role="tablist" aria-label="Loại tài liệu">
          {[['cv', 'CV'], ['cover-letter', 'Cover Letter']].map(([kind, label]) => <button key={kind} id={`tab-${kind}`} role="tab" aria-selected={cv.kind === kind} aria-controls="document-workspace" disabled={busy || cv.loading} className={cv.kind === kind ? 'active' : ''}
            onClick={() => run(async () => { await cv.changeKind(kind); invalidate(); })}>{label}</button>)}
        </div>
        <div className="sidebar-heading"><span className="eyebrow">KHÔNG GIAN {documentLabel.toUpperCase()}</span><h1>Bản của bạn</h1><p>Chọn {documentLabel}, bấm vào nội dung để sửa, rồi xem bản in.</p></div>
        <label className="control-label" htmlFor="cv-select">{documentLabel} đang mở</label>
        <select id="cv-select" value={cv.filename} disabled={busy || cv.loading} onChange={event => run(async () => { await cv.changeFile(event.target.value); invalidate(); })}>
          {!cv.files.length && <option value="">Chưa có {documentLabel}</option>}
          {cv.files.map(file => <option key={file} value={file}>{file.replace(/\.md$/, '')}</option>)}
        </select>
        <div className="file-actions">
          <button disabled={busy || cv.loading || !window.desktop} onClick={isLetter && !cv.data ? askLetter : askDuplicate}><Copy size={15} />{cv.data ? 'Tạo bản sao' : 'Tạo mới'}</button>
          <button disabled={busy || cv.loading || !window.desktop} title="Đọc lại tài liệu sau khi Codex sửa file" onClick={() => cv.dirty ? setModal('reload') : run(reload)}><RefreshCw size={15} />Nạp lại</button>
        </div>
        {isLetter && <><button className="text-button" disabled={busy || cv.loading || !window.desktop} onClick={askLetter}>+ Tạo Cover Letter mới</button><p className="letter-hint">Thư mới dùng tên, liên hệ và căn trang của CV vừa mở. Font và kiểu trình bày đồng bộ với CV.</p></>}
        <button className="text-button folder-button" disabled={busy || cv.loading || !window.desktop} onClick={() => run(async () => { await cv.chooseFolder(); invalidate(); })}><FolderOpen size={16} />Chọn thư mục tài liệu</button>
        <div className="folder-path" title={cv.directory}>{cv.directory}</div>
        <div className={`page-card ${overflow ? 'warning' : ''}`}>
          <div className="page-card-title">{overflow ? <AlertCircle size={19} /> : <FileText size={19} />}<b>{!cv.data ? 'Khổ giấy A4' : pdfPages != null ? `PDF: ${pdfPages} trang A4` : overflow ? `Ước tính tràn ${overflowMM.toFixed(1)} mm` : 'Ước tính vừa 1 trang A4'}</b></div>
          <div className="page-meter"><span style={{ width: `${Math.min(100, usedHeight / availableHeight * 100)}%` }} /></div>
          <p>{pdfPages != null ? overflow ? 'PDF thực tế có nhiều hơn một trang. Giảm khoảng cách, cỡ chữ hoặc sửa nội dung.' : 'Đã kiểm tra PDF thực tế: vừa một trang. Bạn có thể lưu hoặc in.' : 'Ước tính theo màn hình. Bấm Xem bản in để kiểm tra số trang PDF chính xác.'}</p>
        </div>
        <div className="layout-controls"><span className="eyebrow">CĂN TRANG</span>
          {[
            ['fontSize', 'Cỡ chữ', 9, 16, 0.25, `${(cv.layout.fontSize * 0.75).toFixed(1)} pt`],
            ['lineHeight', 'Giãn dòng', 1.1, 1.8, 0.05, cv.layout.lineHeight.toFixed(2)],
            ['sectionGap', isLetter ? 'Khoảng cách phần' : 'Khoảng cách mục', 3, 20, 1, `${cv.layout.sectionGap} px`],
            ['margin', 'Lề trang', 6, 20, 0.5, `${cv.layout.margin} mm`],
          ].map(([key, label, min, max, step, display]) => <label className="slider-control" key={key}>
            <span>{label}<b>{display}</b></span><input type="range" min={min} max={max} step={step} value={cv.layout[key]} disabled={!cv.data || busy || mode === 'pdf'}
              onChange={event => edit(cv.data, { ...cv.layout, [key]: Number(event.target.value) })} />
          </label>)}
          <button className="text-button" disabled={!cv.history.length || busy} onClick={() => { invalidate(); cv.undo(); }}><Undo2 size={15} />Hoàn tác chỉnh sửa</button>
        </div>
        <div className="sidebar-note">JD và nội dung: trao đổi trong Codex.<br />Sửa xong ở Codex? Bấm <b>Nạp lại</b> tại đây.</div>
      </aside>
      <main className="workspace" id="document-workspace" role="tabpanel" aria-labelledby={`tab-${cv.kind}`}>
        <div className="workspace-top no-print"><span>{mode === 'pdf' ? 'BẢN PDF THỰC TẾ' : 'CHỈNH SỬA TRÊN TRANG'}<b>{mode === 'pdf' && pdf ? `${pdf.document.numPages} trang · A4` : 'A4 · 210 × 297 mm'}</b></span>
          {mode === 'edit' && <label className="zoom-control">Thu/phóng <select aria-label="Thu phóng" value={zoom} onChange={event => setZoom(Number(event.target.value))}>{[0.7, 0.85, 1, 1.15, 1.3].map(value => <option key={value} value={value}>{Math.round(value * 100)}%</option>)}</select></label>}
        </div>
        {cv.error && <div className="banner error no-print" role="alert"><AlertCircle size={18} /><span>{cv.error}</span>{cv.data && <button onClick={() => run(() => cv.flush())}><Save size={14} />Thử lưu lại</button>}</div>}
        {cv.external && <div className="banner no-print"><RefreshCw size={17} /><span>Có bản {documentLabel} mới từ bên ngoài app.</span><button onClick={() => cv.dirty ? setModal('reload') : run(reload)}>Nạp bản mới</button></div>}
        {notice && <div className="banner no-print" role="status">{notice}</div>}
        {busy && <div className="busy-label no-print" role="status">Đang xử lý...</div>}
        {cv.loading ? <div className="empty-state no-print">Đang mở {documentLabel}...</div> : cv.data ? <>
          <div className={`paper-workspace ${mode === 'pdf' ? 'behind-preview' : ''}`} inert={busy || mode === 'pdf' ? '' : undefined}>
            <CVEditor key={cv.filename} data={cv.data} layout={cv.layout} edit={edit} sheetRef={sheet} overflow={overflow} zoom={zoom} />
          </div>
          {mode === 'pdf' && pdf && <div className="pdf-workspace no-print"><PDFPreview pdf={pdf} onError={cv.fail} /></div>}
        </> : <div className="empty-state no-print"><FileText size={40} /><h2>{isLetter ? 'Tạo Cover Letter đầu tiên' : 'Mở CV đầu tiên của bạn'}</h2><p>{isLetter ? 'Dùng cùng font và kiểu trình bày với CV để nộp chung hồ sơ.' : 'Chọn thư mục chứa các CV đã custom trong Codex hoặc tạo CV mới.'}</p><button disabled={!window.desktop || busy} className="primary" onClick={isLetter ? askLetter : () => run(cv.chooseFolder)}>{isLetter ? 'Tạo Cover Letter' : 'Chọn thư mục CV'}</button></div>}
      </main>
    </div>
    {modal && <div className="modal-backdrop no-print"><div role="dialog" aria-modal="true" aria-labelledby="dialog-title" className="modal">
      <h2 id="dialog-title">{modal === 'reload' ? 'Nạp lại bản trên máy?' : `Lưu thành ${documentLabel} mới`}</h2>
      {modal !== 'reload' ? <form onSubmit={event => { event.preventDefault(); run(async () => { await cv.duplicate(newName, modal === 'create-letter'); invalidate(); setModal(null); }); }}>
        <label>Tên {documentLabel}<input autoFocus aria-label={`Tên ${documentLabel} mới`} value={newName} onChange={event => setNewName(event.target.value)} maxLength={175} /></label><p>Bản hiện tại vẫn được giữ lại.</p>
        {cv.error && <p className="dialog-error" role="alert">{cv.error}</p>}
        <div className="modal-actions"><button type="button" onClick={() => setModal(null)}>Hủy</button><button className="primary" disabled={!newName.trim() || busy}>{modal === 'create-letter' ? 'Tạo Cover Letter' : 'Tạo bản sao'}</button></div>
      </form> : <><p>Bản đang sửa có thay đổi chưa lưu. Bạn có thể tạo bản sao trước để giữ lại.</p><div className="modal-actions"><button onClick={() => setModal(null)}>Hủy</button><button onClick={askDuplicate}>Tạo bản sao</button><button className="primary" onClick={() => run(reload)}>Bỏ sửa và nạp lại</button></div></>}
    </div></div>}
  </div>;
}
