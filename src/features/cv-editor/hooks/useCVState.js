import { useState, useEffect, useRef } from 'react';
import { createCoverLetter } from '../coverLetter';
import { defaultLayout, createCVDocument, letterLayout } from '../templates';

const emptyCV = { name: 'Họ và tên', contact: 'Email • Số điện thoại • Địa chỉ', summary: '', sections: { 'WORK EXPERIENCE': [], EDUCATION: [], SKILLS: [] } };

export function useCVState() {
  const [state, setState] = useState({ kind: 'cv', data: null, layout: defaultLayout, filename: '', files: [], directory: '', loading: true, dirty: false, saving: false, error: '', external: false, history: [] });
  const sourceCV = useRef(null);
  const current = useRef(state);
  const revision = useRef(null);
  const version = useRef(0);
  const pending = useRef(null);
  const timeout = useRef(null);
  const mounted = useRef(true);
  const lastUndo = useRef(0);
  function publish(patch) {
    current.current = { ...current.current, ...patch };
    if (mounted.current) setState(current.current);
    window.desktop?.setDirty(current.current.dirty);
  }
  async function load(filename, list) {
    publish({ loading: true, error: '' });
    try {
      const document = await window.desktop.load(filename);
      revision.current = document.revision;
      version.current++;
      lastUndo.current = 0;
      publish({ ...list, ...document, filename, dirty: false, external: false, history: [] });
      localStorage.setItem(`${current.current.kind === 'cv' ? 'lastCV' : 'lastCoverLetter'}:${current.current.directory}`, filename);
    } finally { publish({ loading: false }); }
  }
  async function openList(list) {
    if (!list.files.length) {
      revision.current = null;
      lastUndo.current = 0;
      publish({ ...list, data: null, filename: '', loading: false, dirty: false, history: [], error: '', external: false });
      return;
    }
    const previous = localStorage.getItem(`${current.current.kind === 'cv' ? 'lastCV' : 'lastCoverLetter'}:${list.directory}`);
    await load(list.files.includes(previous) ? previous : list.files[0], list);
  }
  function fail(error) { publish({ error: error.message, saving: false }); }
  function flush() {
    clearTimeout(timeout.current);
    if (pending.current) return pending.current;
    const task = (async () => {
      while (current.current.dirty) {
        const snapshot = current.current;
        const savedVersion = version.current;
        publish({ saving: true, error: '' });
        const result = await window.desktop.save(snapshot.filename, snapshot.data, snapshot.layout, revision.current, false);
        revision.current = result.revision;
        if (version.current === savedVersion) publish({ dirty: false });
      }
      publish({ saving: false });
    })();
    pending.current = task;
    task.finally(() => { pending.current = null; }).catch(() => {});
    return task;
  }
  function edit(data, layout = current.current.layout, forceUndo = false) {
    const before = current.current;
    const now = Date.now();
    const history = forceUndo || now - lastUndo.current > 700 ?
      [...before.history.slice(-49), { data: before.data, layout: before.layout }] : before.history;
    lastUndo.current = now;
    version.current++;
    publish({ data, layout, dirty: true, history });
    clearTimeout(timeout.current);
    timeout.current = setTimeout(() => flush().catch(fail), 600);
  }
  function undo() {
    const history = [...current.current.history];
    const previous = history.pop();
    if (!previous) return;
    edit(previous.data, previous.layout);
    publish({ history });
  }
  async function changeFile(filename) {
    await flush();
    await load(filename);
  }
  async function duplicate(name, fresh = false) {
    const source = current.current;
    const filename = name.trim().endsWith('.md') ? name.trim() : `${name.trim()}.md`;
    clearTimeout(timeout.current);
    if (pending.current) await pending.current.catch(() => {});
    const newLetter = source.kind === 'cover-letter' && (fresh || !source.data);
    const data = newLetter ? createCoverLetter(sourceCV.current?.data) : source.data || emptyCV;
    const layout = newLetter ? letterLayout(sourceCV.current?.layout) : source.layout;
    // A fresh letter is independent; preserve pending edits to the current document first.
    if (fresh) await flush();
    await window.desktop.save(filename, data, layout, null, true);
    const list = await window.desktop.list(source.kind);
    await load(filename, list);
  }
  async function createCV(name, templateId, sourceFilename, imported) {
    await flush();
    const source = imported || (sourceFilename ? await window.desktop.load(sourceFilename) : null);
    const { data, layout } = createCVDocument(source, templateId);
    const filename = name.trim().endsWith('.md') ? name.trim() : `${name.trim()}.md`;
    await window.desktop.save(filename, data, layout, null, true);
    const list = await window.desktop.list('cv');
    publish({ kind: 'cv' });
    await load(filename, list);
  }
  async function reload() {
    clearTimeout(timeout.current);
    if (pending.current) await pending.current.catch(() => {});
    const list = await window.desktop.list(current.current.kind);
    if (list.files.includes(current.current.filename)) await load(current.current.filename, list);
    else await openList(list);
  }
  async function chooseFolder() {
    await flush();
    const list = await window.desktop.chooseFolder(current.current.kind);
    if (list) { sourceCV.current = null; await openList(list); }
  }
  async function changeKind(kind) {
    if (kind === current.current.kind) return;
    await flush();
    const before = current.current;
    if (before.kind === 'cv' && before.data) sourceCV.current = { data: before.data, layout: before.layout, filename: before.filename };
    const list = await window.desktop.list(kind);
    publish({ kind, loading: true });
    try { await openList(list); }
    catch (error) { publish(before); throw error; }
  }
  useEffect(() => {
    mounted.current = true;
    if (!window.desktop) {
      publish({ loading: false, error: 'Hãy mở CV Studio.exe để sửa và in CV. Giao diện desktop không cần chạy npm server.' });
      return;
    }
    window.desktop.list().then(openList).catch(error => { fail(error); publish({ loading: false }); });
    const offClose = window.desktop.onClose(() => flush().then(() => window.desktop.closeReady()).catch(fail));
    const onFocus = async () => {
      if (!current.current.filename || current.current.loading || pending.current) return;
      const filename = current.current.filename;
      const atVersion = version.current;
      try {
        const document = await window.desktop.load(filename);
        if (filename === current.current.filename && atVersion === version.current && document.revision !== revision.current) publish({ external: true });
      } catch (error) { fail(error); }
    };
    window.addEventListener('focus', onFocus);
    return () => { mounted.current = false; clearTimeout(timeout.current); offClose(); window.removeEventListener('focus', onFocus); };
  }, []);
  return { ...state, sourceName: sourceCV.current?.filename || '', edit, undo, flush, changeKind, changeFile, duplicate, createCV, reload, chooseFolder, fail, clearError: () => publish({ error: '' }) };
}
