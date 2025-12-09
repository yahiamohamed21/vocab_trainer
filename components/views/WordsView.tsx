'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import Swal from 'sweetalert2';
import {
  BookOpen,
  Trash2,
  Volume2,
  Plus,
  LayoutGrid,
  Rows3,
  Tag,
} from 'lucide-react';
import { LANGUAGES } from '@/lib/constants';
import { useAppState } from '@/context/AppStateContext';
import { useUiSettings } from '@/context/UiSettingsContext';
import { useAuth } from '@/context/AuthContext';
import type { Word } from '@/lib/types';
import RecordingActions from '@/components/RecordingActions';

const cardVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
};

const PAGE_SIZE = 30;
type ViewMode = 'cards' | 'compact';

const swalDarkBase = {
  background: '#020617',
  color: '#e5e7eb',
  confirmButtonColor: '#38bdf8',
  cancelButtonColor: '#64748b',
};

const swalLightBase = {
  background: '#ffffff',
  color: '#020617',
  confirmButtonColor: '#0ea5e9',
  cancelButtonColor: '#64748b',
};

export default function WordsView() {
  const {
    words,
    currentLanguageId,
    initialized,
    addOrUpdateWord,
    deleteWord,
    deleteWordsForCurrentLanguage,
    updateWordRecording,
  } = useAppState();

  const { uiLang, theme } = useUiSettings();
  const { user } = useAuth();

  const isAr = uiLang === 'ar';
  const isDark = theme === 'dark';
  const swalBase = isDark ? swalDarkBase : swalLightBase;

  const [newText, setNewText] = useState('');
  const [newTranslation, setNewTranslation] = useState('');
  const [newExample, setNewExample] = useState('');
  const [newTopic, setNewTopic] = useState('');
  const [search, setSearch] = useState('');
  const [topicFilter, setTopicFilter] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [page, setPage] = useState(1);

  // اللغة الحالية من القائمة، بطريقة آمنة
  const lang = useMemo(
    () => LANGUAGES.find(l => l.id === currentLanguageId) ?? null,
    [currentLanguageId],
  );

  // كلمات هذه اللغة من الـ context (سواء backend أو local حسب AppStateContext)
  const wordsForLang = useMemo(
    () => words.filter(w => w.languageId === currentLanguageId),
    [words, currentLanguageId],
  );

  const filtered = useMemo(
    () =>
      wordsForLang.filter(w => {
        const t = search.toLowerCase().trim();
        const topicT = topicFilter.toLowerCase().trim();

        if (t) {
          const inText = w.text.toLowerCase().includes(t);
          const inTrans = (w.translation ?? '').toLowerCase().includes(t);
          if (!inText && !inTrans) return false;
        }

        if (topicT) {
          const topicValue = (w.topic ?? '').toLowerCase();
          if (!topicValue.includes(topicT)) return false;
        }

        return true;
      }),
    [wordsForLang, search, topicFilter],
  );

  useEffect(() => {
    setPage(1);
  }, [search, topicFilter, currentLanguageId, viewMode]);

  const visible = filtered.slice(0, page * PAGE_SIZE);
  const canLoadMore = visible.length < filtered.length;

  async function handleSave() {
    if (!newText.trim()) return;

    const trimmed = newText.trim();
    const exists = wordsForLang.some(
      w => w.text.trim().toLowerCase() === trimmed.toLowerCase(),
    );

    if (exists) {
      const result = await Swal.fire({
        ...swalBase,
        icon: 'warning',
        title: isAr ? 'الكلمة مكتوبة قبل كده' : 'Word already exists',
        text: isAr
          ? 'هذه الكلمة موجودة بالفعل في نفس اللغة. تحب تحدّث بياناتها؟'
          : 'This word already exists in this language. Do you want to update its data?',
        showCancelButton: true,
        confirmButtonText: isAr ? 'نعم، حدّثها' : 'Yes, update',
        cancelButtonText: isAr ? 'إلغاء' : 'Cancel',
      });

      if (!result.isConfirmed) return;
    }

    const trimmedTranslation = newTranslation.trim();
    const trimmedExample = newExample.trim();
    const trimmedTopic = newTopic.trim();

    try {
      await addOrUpdateWord({
        text: trimmed,
        translation: trimmedTranslation,
        example: trimmedExample,
        topic: trimmedTopic,
      });

      setNewText('');
      setNewTranslation('');
      setNewExample('');
      setNewTopic('');

      await Swal.fire({
        ...swalBase,
        icon: 'success',
        title: isAr ? 'تم الحفظ' : 'Saved',
        text: isAr
          ? 'تم حفظ الكلمة بنجاح.'
          : 'Word saved successfully.',
        timer: 1200,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error('handleSave error:', error);
      await Swal.fire({
        ...swalBase,
        icon: 'error',
        title: isAr ? 'لم يتم حفظ الكلمة' : 'Could not save word',
        text: isAr
          ? 'حدث خطأ أثناء حفظ الكلمة. حاول مرة أخرى.'
          : 'An error occurred while saving the word. Please try again.',
      });
    }
  }

  function speakWord(word: Word) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window))
      return;

    const synth = window.speechSynthesis;
    const l =
      LANGUAGES.find(l => l.id === word.languageId) ?? lang;

    if (!l) return;

    const utter = new SpeechSynthesisUtterance(word.text);
    utter.lang = l.ttsCode;
    synth.speak(utter);
  }

  async function confirmDeleteWord(word: Word) {
    const result = await Swal.fire({
      ...swalBase,
      icon: 'warning',
      title: isAr ? 'حذف الكلمة' : 'Delete word',
      text: isAr
        ? `هتحذف الكلمة "${word.text}" نهائيًا لهذه اللغة.`
        : `You are about to delete the word "${word.text}" for this language.`,
      showCancelButton: true,
      confirmButtonText: isAr ? 'نعم، احذف' : 'Yes, delete',
      cancelButtonText: isAr ? 'إلغاء' : 'Cancel',
      confirmButtonColor: '#ef4444',
    });

    if (!result.isConfirmed) return;

    try {
      await deleteWord(word.id);

      await Swal.fire({
        ...swalBase,
        icon: 'success',
        title: isAr ? 'تم الحذف' : 'Deleted',
        text: isAr ? 'تم حذف الكلمة.' : 'Word deleted.',
        timer: 1000,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error('confirmDeleteWord error:', error);
      await Swal.fire({
        ...swalBase,
        icon: 'error',
        title: isAr ? 'لم يتم الحذف' : 'Could not delete',
        text: isAr
          ? 'حدث خطأ أثناء حذف الكلمة.'
          : 'An error occurred while deleting the word.',
      });
    }
  }

  async function confirmDeleteAll() {
    if (wordsForLang.length === 0) return;

    const result = await Swal.fire({
      ...swalBase,
      icon: 'warning',
      title: isAr
        ? 'مسح كل كلمات هذه اللغة'
        : 'Delete all words',
      text: isAr
        ? `هتمسح كل (${wordsForLang.length}) كلمة الخاصة باللغة الحالية. متأكد؟`
        : `This will delete all (${wordsForLang.length}) words for the current language. Are you sure?`,
      showCancelButton: true,
      confirmButtonText: isAr ? 'نعم، امسح الكل' : 'Yes, delete all',
      cancelButtonText: isAr ? 'إلغاء' : 'Cancel',
      confirmButtonColor: '#ef4444',
    });

    if (!result.isConfirmed) return;

    try {
      await deleteWordsForCurrentLanguage();

      await Swal.fire({
        ...swalBase,
        icon: 'success',
        title: isAr ? 'تم المسح' : 'Deleted',
        text: isAr
          ? 'تم مسح كل كلمات هذه اللغة.'
          : 'All words for this language have been deleted.',
        timer: 1200,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error('confirmDeleteAll error:', error);
      await Swal.fire({
        ...swalBase,
        icon: 'error',
        title: isAr ? 'لم يتم المسح' : 'Could not delete all',
        text: isAr
          ? 'حدث خطأ أثناء مسح الكلمات.'
          : 'An error occurred while deleting the words.',
      });
    }
  }

  // لو لم يتم تحديد لغة أو لم تُوجد في القائمة
  if (!lang) {
    return (
      <section className="space-y-3">
        <p className="text-sm text-slate-200">
          {isAr
            ? 'من فضلك اختر لغة من الإعدادات قبل إدارة الكلمات.'
            : 'Please select a language in settings before managing words.'}
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      {/* شريط علوي: إضافة + إدارة */}
      <div className="grid gap-4 md:grid-cols-[minmax(0,1.9fr)_minmax(0,1.2fr)]">
        {/* إضافة كلمة */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="panel space-y-3 rounded-2xl border border-slate-800 px-4 py-3"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-500/20 text-sky-300">
                <Plus size={16} />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-100">
                  {isAr ? 'إضافة كلمة جديدة' : 'Add new word'}
                </p>
                <p className="text-[11px] text-slate-400">
                  {isAr ? 'تُحفظ تحت:' : 'Saved under:'}{' '}
                  {lang.label} ({lang.nativeLabel})
                </p>
              </div>
            </div>
            <span className="rounded-full bg-slate-950/60 px-2 py-0.5 text-[10px] text-slate-400 border border-slate-700/70">
              {isAr ? 'إجمالي:' : 'Total:'} {wordsForLang.length}{' '}
              {isAr ? 'كلمة' : 'words'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="space-y-1 md:col-span-1">
              <label className="text-[11px] text-slate-300">
                {isAr ? 'الكلمة' : 'Word'}
              </label>
              <input
                value={newText}
                onChange={e => setNewText(e.target.value)}
                type="text"
                placeholder={isAr ? 'apple' : 'apple'}
                className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-1.5 text-xs text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/70 focus:border-sky-400/80"
              />
            </div>
            <div className="space-y-1 md:col-span-1">
              <label className="text-[11px] text-slate-300">
                {isAr ? 'الترجمة' : 'Translation'}
              </label>
              <input
                value={newTranslation}
                onChange={e => setNewTranslation(e.target.value)}
                type="text"
                placeholder={isAr ? 'تفاحة' : 'Apple'}
                className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-1.5 text-xs text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/70 focus:border-sky-400/80"
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-[11px] text-slate-300">
                {isAr ? 'مثال (اختياري)' : 'Example (optional)'}
              </label>
              <input
                value={newExample}
                onChange={e => setNewExample(e.target.value)}
                type="text"
                placeholder={
                  isAr
                    ? 'I eat an apple every morning.'
                    : 'I eat an apple every morning.'
                }
                className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-1.5 text-xs text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/70 focus:border-sky-400/80"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] text-slate-300">
                {isAr
                  ? 'التصنيف / المجموعة (اختياري)'
                  : 'Topic / group (optional)'}
              </label>
              <div className="flex items-center gap-2">
                <Tag size={14} className="text-slate-500" />
                <input
                  value={newTopic}
                  onChange={e => setNewTopic(e.target.value)}
                  type="text"
                  placeholder={
                    isAr
                      ? 'مثال: food, travel, A1...'
                      : 'e.g. food, travel, A1...'
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-1.5 text-xs text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/70 focus:border-sky-400/80"
                />
              </div>
            </div>
            <div className="flex items-end justify-between gap-2">
              <button
                onClick={handleSave}
                className="inline-flex items-center gap-1 rounded-full bg-sky-500 px-4 py-1.5 text-[11px] font-semibold text-slate-950 hover:bg-sky-400 transition-colors"
              >
                <Plus size={14} />
                {isAr ? 'حفظ الكلمة' : 'Save word'}
              </button>
              <p className="text-[10px] text-slate-500">
                {isAr
                  ? 'الكلمات المضافة هنا تظهر في التمارين والإحصائيات.'
                  : 'Words added here are used in quizzes and stats.'}
              </p>
            </div>
          </div>
        </motion.div>

        {/* إدارة / بحث / فلاتر / وضع العرض */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="panel space-y-3 rounded-2xl border border-slate-800 px-4 py-3"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300">
                <BookOpen size={16} />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-100">
                  {isAr ? 'إدارة الكلمات' : 'Manage words'}
                </p>
                <p className="text-[11px] text-slate-400">
                  {isAr
                    ? 'ابحث، فلتر بالتصنيف، واختر طريقة العرض.'
                    : 'Search, filter by topic, and choose view mode.'}
                </p>
              </div>
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={() => setViewMode('cards')}
                className={[
                  'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] transition-colors',
                  viewMode === 'cards'
                    ? 'border-sky-400/80 bg-sky-500/20 text-sky-50'
                    : 'border-slate-700 bg-slate-950/60 text-slate-400 hover:border-slate-500',
                ].join(' ')}
              >
                <LayoutGrid size={13} />
                {isAr ? 'كروت' : 'Cards'}
              </button>
              <button
                onClick={() => setViewMode('compact')}
                className={[
                  'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] transition-colors',
                  viewMode === 'compact'
                    ? 'border-sky-400/80 bg-sky-500/20 text-sky-50'
                    : 'border-slate-700 bg-slate-950/60 text-slate-400 hover:border-slate-500',
                ].join(' ')}
              >
                <Rows3 size={13} />
                {isAr ? 'مضغوط' : 'Compact'}
              </button>
            </div>
          </div>

          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            type="text"
            placeholder={
              isAr
                ? 'ابحث عن كلمة أو ترجمة...'
                : 'Search for word or translation...'
            }
            className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-xs sm:text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/70 focus:border-sky-400/80"
          />

          <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)] gap-2">
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400">
                {isAr ? 'فلتر بالتصنيف (topic)' : 'Filter by topic'}
              </label>
              <input
                value={topicFilter}
                onChange={e => setTopicFilter(e.target.value)}
                type="text"
                placeholder={
                  isAr
                    ? 'مثال: food, travel, A1...'
                    : 'e.g. food, travel, A1...'
                }
                className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-1.5 text-[11px] text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/70 focus:border-sky-400/80"
              />
            </div>
            <div className="flex items-end justify-between gap-2">
              <button
                onClick={confirmDeleteAll}
                className="inline-flex items-center gap-1 text-[11px] text-rose-400 hover:text-rose-300"
              >
                <Trash2 size={14} />
                {isAr
                  ? 'مسح كل كلمات هذه اللغة'
                  : 'Delete all words for this language'}
              </button>
              <p className="text-[10px] text-slate-500 text-right">
                {isAr ? 'المعروض الآن:' : 'Showing:'} {visible.length}{' '}
                {isAr ? 'من' : 'of'} {filtered.length}
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* حالة تحميل من الـ Backend عبر AppStateContext */}
      {user && !initialized && (
        <p className="text-[11px] text-slate-400">
          {isAr
            ? 'جاري تحميل الكلمات من الخادم...'
            : 'Loading words from server...'}
        </p>
      )}

      {/* قائمة الكلمات */}
      {initialized && filtered.length === 0 ? (
        <p className="text-[11px] text-slate-400">
          {isAr
            ? 'لا توجد كلمات بعد لهذه اللغة بهذه الفلاتر. جرّب إزالة البحث أو التصنيف.'
            : 'No words for this language with the current filters. Try clearing search or topic.'}
        </p>
      ) : viewMode === 'cards' ? (
        <>
          <div className="mt-1 grid grid-cols-1 md:grid-cols-2 gap-3">
            {visible.map((w, index) => (
              <motion.div
                key={w.id}
                variants={cardVariants}
                initial="initial"
                animate="animate"
                transition={{ delay: index * 0.02 }}
                whileHover={{ y: -2, scale: 1.01 }}
                className="panel group rounded-2xl border border-slate-800 bg-slate-900/70 p-3 flex flex-col gap-2 shadow-sm hover:border-sky-500/60 transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <p className="inline-flex items-center gap-1 text-sm font-semibold text-slate-50">
                      {w.text}
                      <span className="rounded-full bg-slate-800/70 px-1.5 py-0.5 text-[10px] text-slate-400">
                        {w.languageId.toUpperCase()}
                      </span>
                    </p>
                    <p className="text-xs text-slate-200">
                      {w.translation
                        ? (isAr
                            ? `الترجمة: ${w.translation}`
                            : `Translation: ${w.translation}`)
                        : isAr
                        ? 'لا توجد ترجمة بعد.'
                        : 'No translation yet.'}
                    </p>
                    {w.example && (
                      <p className="text-[11px] text-slate-400">
                        {isAr ? 'مثال: ' : 'Example: '}
                        {w.example}
                      </p>
                    )}
                    {w.topic && (
                      <p className="text-[11px] text-sky-300/90">
                        {isAr ? 'التصنيف: ' : 'Topic: '}
                        {w.topic}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 text-[10px] text-slate-500">
                    <p>
                      {isAr ? 'مراجعات: ' : 'Reviews: '}{' '}
                      {w.reviewCount ?? 0}
                    </p>
                    <p>
                      {isAr ? 'صحيحة: ' : 'Correct: '}{' '}
                      {w.correctCount ?? 0}{' '}
                      {isAr ? '/ خاطئة: ' : '/ wrong: '}{' '}
                      {w.wrongCount ?? 0}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => speakWord(w)}
                      className="inline-flex items-center gap-1 rounded-full bg-sky-500/90 px-3 py-1.5 text-[11px] font-semibold text-slate-950 hover:bg-sky-400 transition-colors"
                    >
                      <Volume2 size={14} />
                      {isAr ? 'نطق' : 'Speak'}
                    </button>

                   {w.recordingUrl && (
  <RecordingActions
    recordingUrl={w.recordingUrl}
    fileName={w.text}
    wordId={user ? w.id : undefined}          // ✅ لو user موجود هيمسح من الباك
    onDeleteLocal={() => updateWordRecording(w.id, null)} // ✅ يمسح محلي
    onDelete={() => updateWordRecording(w.id, null)}      // ✅ احتياط لو الكمبوننت بيستخدم onDelete
  />
)}

                  </div>
                  <button
                    onClick={() => confirmDeleteWord(w)}
                    className="inline-flex items-center gap-1 rounded-full bg-rose-500/90 px-2.5 py-1.5 text-[11px] font-semibold text-slate-50 hover:bg-rose-400 transition-colors"
                  >
                    <Trash2 size={14} />
                    {isAr ? 'حذف' : 'Delete'}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>

          {canLoadMore && (
            <div className="flex justify-center pt-2">
              <button
                onClick={() => setPage(p => p + 1)}
                className="rounded-full border border-sky-400/70 bg-sky-500/15 px-4 py-1.5 text-[11px] font-semibold text-sky-100 hover:bg-sky-500/25 transition-colors"
              >
                {isAr ? 'عرض المزيد من الكلمات' : 'Show more words'}
              </button>
            </div>
          )}
        </>
      ) : (
        <>
          {/* وضع مضغوط (جدول) */}
          <div className="mt-1 panel rounded-2xl border border-slate-800 bg-slate-900/80 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-[11px] text-slate-100">
                <thead className="bg-slate-950/60 border-b border-slate-800">
                  <tr className="text-slate-400">
                    <th className="px-3 py-2 text-right font-normal">
                      {isAr ? 'الكلمة' : 'Word'}
                    </th>
                    <th className="px-3 py-2 text-right font-normal">
                      {isAr ? 'الترجمة' : 'Translation'}
                    </th>
                    <th className="px-3 py-2 text-right font-normal hidden sm:table-cell">
                      {isAr ? 'التصنيف' : 'Topic'}
                    </th>
                    <th className="px-3 py-2 text-right font-normal hidden md:table-cell">
                      {isAr ? 'مراجعات' : 'Reviews'}
                    </th>
                    <th className="px-3 py-2 text-right font-normal">
                      {isAr ? 'إجراءات' : 'Actions'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((w, index) => (
                    <motion.tr
                      key={w.id}
                      variants={cardVariants}
                      initial="initial"
                      animate="animate"
                      transition={{ delay: index * 0.01 }}
                      className="border-b border-slate-800/70 hover:bg-slate-900/70"
                    >
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-50">
                            {w.text}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {w.languageId.toUpperCase()}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {w.translation || (
                          <span className="text-slate-500">
                            {isAr
                              ? 'لا توجد ترجمة'
                              : 'No translation'}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap hidden sm:table-cell">
                        {w.topic ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-2 py-0.5">
                            <Tag size={11} className="text-sky-300" />
                            <span>{w.topic}</span>
                          </span>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap hidden md:table-cell">
                        <div className="flex flex-col text-[10px] text-slate-400">
                          <span>
                            {isAr ? 'مراجعات: ' : 'Reviews: '}{' '}
                            {w.reviewCount ?? 0}
                          </span>
                          <span>
                            {isAr ? 'صح: ' : 'Correct: '}{' '}
                            {w.correctCount ?? 0}{' '}
                            {isAr ? '/ خطأ: ' : '/ wrong: '}{' '}
                            {w.wrongCount ?? 0}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => speakWord(w)}
                            className="inline-flex items-center gap-1 rounded-full bg-sky-500/90 px-2.5 py-1 text-[10px] font-semibold text-slate-950 hover:bg-sky-400 transition-colors"
                          >
                            <Volume2 size={12} />
                            {isAr ? 'نطق' : 'Speak'}
                          </button>

                         {w.recordingUrl && (
  <RecordingActions
    recordingUrl={w.recordingUrl}
    fileName={w.text}
    wordId={user ? w.id : undefined}          // ✅ مهم جداً
    onDeleteLocal={() => updateWordRecording(w.id, null)} // ✅ يمسح محلي بعد نجاح الحذف
    onDelete={() => updateWordRecording(w.id, null)}      // ✅ fallback
  />
)}


                          <button
                            onClick={() => confirmDeleteWord(w)}
                            className="inline-flex items-center gap-1 rounded-full bg-rose-500/90 px-2.5 py-1 text-[10px] font-semibold text-slate-50 hover:bg-rose-400 transition-colors"
                          >
                            <Trash2 size={12} />
                            {isAr ? 'حذف' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {canLoadMore && (
            <div className="flex justify-center pt-2">
              <button
                onClick={() => setPage(p => p + 1)}
                className="rounded-full border border-sky-400/70 bg-sky-500/15 px-4 py-1.5 text-[11px] font-semibold text-sky-100 hover:bg-sky-500/25 transition-colors"
              >
                {isAr ? 'عرض المزيد من الكلمات' : 'Show more words'}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
